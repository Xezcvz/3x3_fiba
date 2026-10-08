const prisma = require('../prisma');
const { parseMatchInput, scoreFromDetails, validateFinishedScore } = require('../utils/match-validation');
const { validateSharedPlayerSchedule } = require('../utils/scheduling-constraints');

const MATCH_STATUSES = new Set(['upcoming', 'live', 'finished']);
const MATCH_CATEGORIES = new Set(['รุ่น A', 'รุ่น B']);

function responseBadRequest(res, message) {
  return res.status(400).json({ message });
}

function parseScoreDetails(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

async function getTeamsForMatch(homeTeamId, awayTeamId) {
  const teams = await prisma.team.findMany({
    where: { id: { in: [homeTeamId, awayTeamId] } },
    // Group-stage create/update validation needs each team's group; omitting it
    // made both values `undefined` and rejected every group-stage edit.
    select: { id: true, category: true, group: true },
  });
  if (teams.length !== 2) return { error: 'ไม่พบข้อมูลทีมที่เลือก' };
  const homeTeam = teams.find((team) => team.id === homeTeamId);
  const awayTeam = teams.find((team) => team.id === awayTeamId);
  if (homeTeamId === awayTeamId) return { error: 'ทีมทั้งสองฝั่งต้องไม่ใช่ทีมเดียวกัน' };
  if (homeTeam.category !== awayTeam.category) return { error: 'เลือกทีมจากรุ่นการแข่งขันเดียวกันเท่านั้น' };
  return { homeTeam, awayTeam };
}

function validateScoreState(status, homeScore, awayScore, details) {
  const scoreError = validateFinishedScore(status, homeScore, awayScore, details);
  if (scoreError) return scoreError;
  if (details?.winReason === '21pts' && status === 'finished' && Math.max(homeScore, awayScore) < 21) {
    return 'คะแนนชนะต้องถึง 21 แต้มตามเงื่อนไขที่เลือก';
  }
  if (status === 'live' && homeScore !== null && awayScore !== null && Math.max(homeScore, awayScore) >= 21) {
    return 'ทีมที่ถึง 21 แต้มต้องเปลี่ยนสถานะแมตช์เป็นจบการแข่งขัน';
  }
  return null;
}

async function getMatches(req, res, next) {
  try {
    const { status, group, category, venue, teamId, limit } = req.query;

    const where = {};

    if (status && status !== 'all' && !MATCH_STATUSES.has(status)) {
      return responseBadRequest(res, 'สถานะแมตช์ไม่ถูกต้อง');
    }
    if (status && status !== 'all') {
      where.status = status;
    }

    if (category && category !== 'all') {
      if (!MATCH_CATEGORIES.has(category)) return responseBadRequest(res, 'รุ่นการแข่งขันไม่ถูกต้อง');
      where.category = category;
    }

    if (venue && venue !== 'all') {
      if (typeof venue !== 'string' || venue.length > 120) return responseBadRequest(res, 'ชื่อสนามไม่ถูกต้อง');
      where.venue = { contains: venue };
    }

    if (teamId) {
      const parsedTeamId = /^\d+$/.test(teamId) ? Number(teamId) : NaN;
      if (!Number.isSafeInteger(parsedTeamId) || parsedTeamId <= 0) return responseBadRequest(res, 'รหัสทีมไม่ถูกต้อง');
      where.AND = [...(where.AND || []), { OR: [{ homeTeamId: parsedTeamId }, { awayTeamId: parsedTeamId }] }];
    }

    if (group && group !== 'all') {
      if (!['A', 'B', 'C'].includes(group)) return responseBadRequest(res, 'กลุ่มการแข่งขันไม่ถูกต้อง');
      where.AND = [...(where.AND || []), { OR: [
        { homeTeam: { group } },
        { awayTeam: { group } },
      ] }];
    }

    const parsedLimit = limit === undefined ? undefined : Number(limit);
    if (parsedLimit !== undefined && (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100)) {
      return responseBadRequest(res, 'limit ต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 100');
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: [{ matchDate: status === 'finished' ? 'desc' : 'asc' }],
      take: parsedLimit,
    });

    // Helper to safely parse quarterScores
    const formattedMatches = matches.map(m => {
      let quarters = null;
      if (m.quarterScores) {
        try {
          quarters = JSON.parse(m.quarterScores);
        } catch (e) {
          quarters = null;
        }
      }
      return {
        ...m,
        quarterScoresObj: quarters,
      };
    });

    return res.json(formattedMatches);
  } catch (error) {
    next(error);
  }
}

async function getMatchById(req, res, next) {
  try {
    const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : NaN;
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid match ID' });
    }

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true,
      }
    });

    if (!match) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลแมตช์การแข่งขัน' });
    }

    let quarters = null;
    if (match.quarterScores) {
      try {
        quarters = JSON.parse(match.quarterScores);
      } catch (e) {
        quarters = null;
      }
    }

    return res.json({
      ...match,
      quarterScoresObj: quarters,
    });
  } catch (error) {
    next(error);
  }
}

async function createMatch(req, res, next) {
  try {
    const input = {
      ...req.body,
      category: req.body?.category || 'รุ่น A',
      status: req.body?.status || 'upcoming',
      round: req.body?.round || 'รอบแบ่งกลุ่ม',
      venue: req.body?.venue || 'สนาม 1',
      homeScore: req.body?.homeScore ?? null,
      awayScore: req.body?.awayScore ?? null,
      quarterScores: req.body?.quarterScores ?? null,
    };
    const parsed = parseMatchInput(input);
    if (!parsed.success) return responseBadRequest(res, parsed.message);

    const matchData = parsed.data;
    const teams = await getTeamsForMatch(matchData.homeTeamId, matchData.awayTeamId);
    if (teams.error) return responseBadRequest(res, teams.error);
    if (matchData.round.includes('รอบแบ่งกลุ่ม') && (teams.homeTeam.group !== teams.awayTeam.group || !teams.homeTeam.group)) {
      return responseBadRequest(res, 'แมตช์รอบแบ่งกลุ่มต้องเป็นทีมในกลุ่มเดียวกัน');
    }
    if (teams.homeTeam.category !== matchData.category) return responseBadRequest(res, 'รุ่นแข่งขันต้องตรงกับรุ่นของทีม');
    if (matchData.status !== 'finished') {
      const scheduleError = await validateSharedPlayerSchedule(prisma, {
        teams: [teams.homeTeam, teams.awayTeam],
        matchDate: new Date(matchData.matchDate),
      });
      if (scheduleError) return responseBadRequest(res, scheduleError);
    }

    const details = matchData.quarterScores;
    const derivedHomeScore = scoreFromDetails(details, 'Home');
    const derivedAwayScore = scoreFromDetails(details, 'Away');
    const homeScore = derivedHomeScore ?? matchData.homeScore;
    const awayScore = derivedAwayScore ?? matchData.awayScore;
    const scoreError = validateScoreState(matchData.status, homeScore, awayScore, details);
    if (scoreError) return responseBadRequest(res, scoreError);

    const match = await prisma.match.create({
      data: {
        ...matchData,
        matchDate: new Date(matchData.matchDate),
        homeScore,
        awayScore,
        quarterScores: details ? JSON.stringify(details) : null,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      }
    });

    return res.status(201).json({ message: 'สร้างตารางการแข่งขันสำเร็จ', match });
  } catch (error) {
    next(error);
  }
}

async function updateMatch(req, res, next) {
  try {
    const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : NaN;
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid match ID' });
    }

    const existing = await prisma.match.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'ไม่พบแมตช์ที่ต้องการแก้ไข' });

    const parsed = parseMatchInput(req.body, { partial: true });
    if (!parsed.success) return responseBadRequest(res, parsed.message);
    if (Object.keys(parsed.data).length === 0) return responseBadRequest(res, 'กรุณาระบุข้อมูลที่ต้องการแก้ไข');

    const updates = parsed.data;

    // Date/time edits are intentionally isolated from score, round, and team
    // validation so legacy match data cannot prevent an administrator from
    // correcting only the schedule.
    if (Object.keys(updates).length === 1 && updates.matchDate !== undefined) {
      const teams = await getTeamsForMatch(existing.homeTeamId, existing.awayTeamId);
      if (teams.error) return responseBadRequest(res, teams.error);
      const category = existing.category ?? teams.homeTeam.category;
      if (teams.homeTeam.category !== category) {
        return responseBadRequest(res, 'รุ่นแข่งขันต้องตรงกับรุ่นของทีม');
      }

      const matchDate = new Date(updates.matchDate);
      if (existing.status !== 'finished') {
        const scheduleError = await validateSharedPlayerSchedule(prisma, {
          teams: [teams.homeTeam, teams.awayTeam],
          matchDate,
          excludeMatchId: id,
        });
        if (scheduleError) return responseBadRequest(res, scheduleError);
      }

      const updatedMatch = await prisma.match.update({
        where: { id },
        data: { matchDate },
        include: { homeTeam: true, awayTeam: true },
      });
      return res.json({ message: 'อัปเดตวันและเวลาแข่งขันสำเร็จ', match: updatedMatch });
    }

    const homeTeamId = updates.homeTeamId ?? existing.homeTeamId;
    const awayTeamId = updates.awayTeamId ?? existing.awayTeamId;
    if (homeTeamId == null || awayTeamId == null) {
      return responseBadRequest(res, 'กรุณากำหนดทีมทั้งสองฝั่งก่อนเริ่มแข่งขัน');
    }
    const teams = await getTeamsForMatch(homeTeamId, awayTeamId);
    if (teams.error) return responseBadRequest(res, teams.error);
    const category = updates.category ?? (updates.homeTeamId ? teams.homeTeam.category : existing.category);
    if (teams.homeTeam.category !== category) return responseBadRequest(res, 'รุ่นแข่งขันต้องตรงกับรุ่นของทีม');

    const details = Object.hasOwn(updates, 'quarterScores')
      ? updates.quarterScores
      : parseScoreDetails(existing.quarterScores);
    const hasCompleteBreakdown = details
      && ['onePtHome', 'onePtAway', 'twoPtHome', 'twoPtAway'].every((key) => Number.isInteger(details[key]));
    const homeScoreFromDetails = hasCompleteBreakdown ? scoreFromDetails(details, 'Home') : null;
    const awayScoreFromDetails = hasCompleteBreakdown ? scoreFromDetails(details, 'Away') : null;
    const homeScore = homeScoreFromDetails ?? (updates.homeScore !== undefined ? updates.homeScore : existing.homeScore);
    const awayScore = awayScoreFromDetails ?? (updates.awayScore !== undefined ? updates.awayScore : existing.awayScore);
    const status = updates.status ?? existing.status;
    if ((updates.round ?? existing.round)?.includes('รอบแบ่งกลุ่ม') && (teams.homeTeam.group !== teams.awayTeam.group || !teams.homeTeam.group)) {
      return responseBadRequest(res, 'แมตช์รอบแบ่งกลุ่มต้องเป็นทีมในกลุ่มเดียวกัน');
    }
    const scoreError = validateScoreState(status, homeScore, awayScore, details);
    if (scoreError) return responseBadRequest(res, scoreError);

    const data = { ...updates, category, homeTeamId, awayTeamId, homeScore, awayScore };
    if (updates.matchDate) data.matchDate = new Date(updates.matchDate);
    if (Object.hasOwn(updates, 'quarterScores')) data.quarterScores = details ? JSON.stringify(details) : null;

    const scheduleChanged = updates.matchDate !== undefined
      || updates.homeTeamId !== undefined
      || updates.awayTeamId !== undefined
      || updates.category !== undefined;
    if (scheduleChanged && status !== 'finished') {
      const scheduleError = await validateSharedPlayerSchedule(prisma, {
        teams: [teams.homeTeam, teams.awayTeam],
        matchDate: data.matchDate || existing.matchDate,
        excludeMatchId: id,
      });
      if (scheduleError) return responseBadRequest(res, scheduleError);
    }

    const updatedMatch = await prisma.$transaction(async (transaction) => {
      const { clearDownstreamKnockoutSlots } = require('./tournament.controller');
      const updated = await transaction.match.update({
        where: { id },
        data,
        include: { homeTeam: true, awayTeam: true },
      });
      const participantsChanged = (updates.homeTeamId !== undefined && updates.homeTeamId !== existing.homeTeamId)
        || (updates.awayTeamId !== undefined && updates.awayTeamId !== existing.awayTeamId);
      const resultChanged = status !== existing.status
        || homeScore !== existing.homeScore
        || awayScore !== existing.awayScore
        || (updates.round !== undefined && updates.round !== existing.round);
      if ((participantsChanged || resultChanged) && (existing.status === 'finished' || existing.status === 'live')) {
        await clearDownstreamKnockoutSlots(transaction, existing);
      }
      return updated;
    });

    // Auto-advance winner if this is a finished knockout match
    if (
      updatedMatch.status === 'finished' &&
      updatedMatch.homeScore !== null &&
      updatedMatch.awayScore !== null &&
      updatedMatch.round &&
      (updatedMatch.round.includes('รอบ 8 ทีม') ||
        updatedMatch.round.includes('QF') ||
        (updatedMatch.round.includes('รองชนะเลิศ') && !updatedMatch.round.includes('ก่อน')))
    ) {
      try {
        const { advanceWinnerInternal } = require('./tournament.controller');
        if (typeof advanceWinnerInternal === 'function') {
          await advanceWinnerInternal(updatedMatch.id);
        }
      } catch (err) {
        console.warn('Auto-advance knockout warning:', err.message);
      }
    }

    return res.json({ message: 'อัปเดตข้อมูลแมตช์สำเร็จ', match: updatedMatch });
  } catch (error) {
    if (error.statusCode === 409) return res.status(409).json({ message: error.message });
    next(error);
  }
}

async function deleteMatch(req, res, next) {
  try {
    const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : NaN;
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid match ID' });
    }

    await prisma.match.delete({
      where: { id },
    });

    return res.json({ message: 'ลบแมตช์เรียบร้อยแล้ว' });
  } catch (error) {
    next(error);
  }
}

// POST /api/matches/reset-scores
// Clears scores and sets status to upcoming for all matches or by category
async function resetMatchScores(req, res, next) {
  try {
    const category = req.body?.category;
    if (category !== 'all' && !MATCH_CATEGORIES.has(category)) {
      return responseBadRequest(res, 'กรุณาระบุรุ่นที่ต้องการรีเซ็ต');
    }
    const where = {};
    if (category !== 'all') where.category = category;

    const updated = await prisma.match.updateMany({
      where,
      data: {
        homeScore: null,
        awayScore: null,
        quarterScores: null,
        status: 'upcoming',
      },
    });

    return res.json({
      message: `รีเซ็ตผลคะแนนสำเร็จ (${updated.count} แมตช์)`,
      count: updated.count,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/matches/reset-all
// Deletes all matches or by category
async function resetAllMatches(req, res, next) {
  try {
    const category = req.body?.category;
    if (category !== 'all' && !MATCH_CATEGORIES.has(category)) {
      return responseBadRequest(res, 'กรุณาระบุรุ่นที่ต้องการล้างตาราง');
    }
    const where = {};
    if (category !== 'all') where.category = category;

    const deleted = await prisma.match.deleteMany({
      where,
    });

    return res.json({
      message: `ล้างตารางแข่งขันสำเร็จ (ลบ ${deleted.count} แมตช์)`,
      count: deleted.count,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch,
  resetMatchScores,
  resetAllMatches,
};
