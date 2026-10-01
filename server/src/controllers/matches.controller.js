const prisma = require('../prisma');

async function getMatches(req, res, next) {
  try {
    const { status, group, category, venue, teamId, limit } = req.query;

    const where = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (venue && venue !== 'all') {
      where.venue = { contains: venue };
    }

    if (teamId) {
      const parsedTeamId = parseInt(teamId, 10);
      if (!isNaN(parsedTeamId)) {
        where.OR = [
          { homeTeamId: parsedTeamId },
          { awayTeamId: parsedTeamId }
        ];
      }
    }

    if (group && group !== 'all') {
      where.homeTeam = {
        group: group
      };
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: [
        { matchDate: 'asc' },
      ],
      take: limit ? parseInt(limit, 10) : undefined,
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
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
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
    const {
      homeTeamId,
      awayTeamId,
      category,
      matchDate,
      venue,
      status = 'upcoming',
      round = 'รอบแบ่งกลุ่ม',
      homeScore = null,
      awayScore = null,
      quarterScores = null,
    } = req.body;

    if (!homeTeamId || !awayTeamId) {
      return res.status(400).json({ message: 'กรุณาเลือกทีมเหย้าและทีมเยือน' });
    }

    if (parseInt(homeTeamId, 10) === parseInt(awayTeamId, 10)) {
      return res.status(400).json({ message: 'ทีมเหย้าและทีมเยือนต้องไม่ใช่ทีมเดียวกัน' });
    }

    if (!matchDate) {
      return res.status(400).json({ message: 'กรุณาระบุวันและเวลาแข่งขัน' });
    }

    const stringifiedQuarters = typeof quarterScores === 'object' && quarterScores !== null
      ? JSON.stringify(quarterScores)
      : (typeof quarterScores === 'string' ? quarterScores : null);

    // Look up home team category if not provided
    let matchCat = category;
    if (!matchCat) {
      const ht = await prisma.team.findUnique({ where: { id: parseInt(homeTeamId, 10) } });
      matchCat = ht?.category || 'รุ่น A';
    }

    const match = await prisma.match.create({
      data: {
        homeTeamId: parseInt(homeTeamId, 10),
        awayTeamId: parseInt(awayTeamId, 10),
        category: matchCat,
        matchDate: new Date(matchDate),
        venue: venue || 'สนาม 1',
        status: status || 'upcoming',
        round: round || 'รอบแบ่งกลุ่ม',
        homeScore: homeScore !== null && homeScore !== '' ? parseInt(homeScore, 10) : null,
        awayScore: awayScore !== null && awayScore !== '' ? parseInt(awayScore, 10) : null,
        quarterScores: stringifiedQuarters,
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
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid match ID' });
    }

    const {
      homeTeamId,
      awayTeamId,
      category,
      matchDate,
      venue,
      status,
      round,
      homeScore,
      awayScore,
      quarterScores,
    } = req.body;

    const data = {};

    if (homeTeamId !== undefined) data.homeTeamId = parseInt(homeTeamId, 10);
    if (awayTeamId !== undefined) data.awayTeamId = parseInt(awayTeamId, 10);
    if (category !== undefined) data.category = category;
    if (matchDate !== undefined) data.matchDate = new Date(matchDate);
    if (venue !== undefined) data.venue = venue;
    if (status !== undefined) data.status = status;
    if (round !== undefined) data.round = round;

    if (homeScore !== undefined) {
      data.homeScore = homeScore === null || homeScore === '' ? null : parseInt(homeScore, 10);
    }
    if (awayScore !== undefined) {
      data.awayScore = awayScore === null || awayScore === '' ? null : parseInt(awayScore, 10);
    }

    if (quarterScores !== undefined) {
      data.quarterScores = typeof quarterScores === 'object' && quarterScores !== null
        ? JSON.stringify(quarterScores)
        : (typeof quarterScores === 'string' ? quarterScores : null);
    }

    const updatedMatch = await prisma.match.update({
      where: { id },
      data,
      include: {
        homeTeam: true,
        awayTeam: true,
      }
    });

    return res.json({ message: 'อัปเดตข้อมูลแมตช์สำเร็จ', match: updatedMatch });
  } catch (error) {
    next(error);
  }
}

async function deleteMatch(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
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

module.exports = {
  getMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch,
};
