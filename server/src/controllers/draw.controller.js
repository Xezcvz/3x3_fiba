const prisma = require('../prisma');
const { createDrawPlan, shuffleSecure, validateLockedAssignments } = require('../utils/draw-rules');
const { MATCH_SLOT_MS, getTomorrowAtNineBangkok, createGroupStageRounds } = require('../utils/group-stage-schedule');
const { validateSharedPlayerSchedule } = require('../utils/scheduling-constraints');

async function createScheduledGroupMatches(transaction, teams, category = 'all') {
  const fixtures = createGroupStageRounds(teams);
  if (fixtures.length === 0) throw Object.assign(new Error('ต้องจับทุกทีมลงกลุ่มก่อนจึงจะสร้างโปรแกรมแข่งได้'), { statusCode: 400 });

  const teamIds = teams.map((team) => team.id);
  const existingMatches = await transaction.match.count({
    where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] },
  });
  if (existingMatches > 0) throw Object.assign(new Error('ทีมมีแมตช์อยู่แล้ว กรุณาใช้ตารางเดิมเพื่อป้องกันการสร้างคู่ซ้ำ'), { statusCode: 409 });

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const slots = new Map();
  const baseDate = getTomorrowAtNineBangkok();
  for (const [index, fixture] of fixtures.entries()) {
    let slot = Math.floor(index / 2);
    let venue;
    let matchDate;
    while (true) {
      matchDate = new Date(baseDate.getTime() + slot * MATCH_SLOT_MS);
      const slotState = slots.get(slot) || { teamIds: new Set(), matchCount: 0 };
      const sameSlotConflict = slotState.teamIds.has(fixture.homeTeamId)
        || slotState.teamIds.has(fixture.awayTeamId)
        || slotState.matchCount >= 2;
      const sharedPlayerConflict = await validateSharedPlayerSchedule(transaction, {
        teams: [teamsById.get(fixture.homeTeamId), teamsById.get(fixture.awayTeamId)],
        matchDate,
      });
      if (!sameSlotConflict && !sharedPlayerConflict) {
        venue = slotState.matchCount === 0 ? 'สนาม 1' : 'สนาม 2';
        slotState.teamIds.add(fixture.homeTeamId);
        slotState.teamIds.add(fixture.awayTeamId);
        slotState.matchCount += 1;
        slots.set(slot, slotState);
        break;
      }
      slot += 1;
    }

    await transaction.match.create({
      data: {
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        category: fixture.category || category,
        round: `รอบแบ่งกลุ่ม กลุ่ม ${fixture.group}`,
        venue,
        matchDate,
        status: 'upcoming',
      },
    });
  }
  return fixtures.length;
}

async function generateGroupStageMatches(req, res, next) {
  try {
    const { category = 'all' } = req.body || {};
    if (!['all', 'รุ่น A', 'รุ่น B'].includes(category)) return res.status(400).json({ message: 'รุ่นการแข่งขันไม่ถูกต้อง' });
    const where = category === 'all' ? {} : { category };
    const createdMatches = await prisma.$transaction(async (transaction) => {
      const teams = await transaction.team.findMany({ where, orderBy: [{ group: 'asc' }, { id: 'asc' }] });
      if (teams.length === 0 || teams.some((team) => !team.group)) {
        throw Object.assign(new Error('ต้องจับทุกทีมลงกลุ่มก่อนจึงจะสร้างโปรแกรมแข่งได้'), { statusCode: 400 });
      }
      return createScheduledGroupMatches(transaction, teams, category);
    });
    return res.json({
      message: `สร้างโปรแกรมรอบแบ่งกลุ่ม ${createdMatches} แมตช์แล้ว`,
      createdMatches,
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  }
}

async function prepareDraw(req, res, next) {
  try {
    const { category = 'all', groupCount = 3 } = req.body || {};
    if (!['all', 'รุ่น A', 'รุ่น B'].includes(category)) return res.status(400).json({ message: 'รุ่นการแข่งขันไม่ถูกต้อง' });
    const where = category === 'all' ? {} : { category };
    const teams = await prisma.team.findMany({ where, orderBy: { id: 'asc' } });
    const teamIds = teams.map((team) => team.id);
    if (teamIds.length > 0) {
      const linkedMatches = await prisma.match.count({
        where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] },
      });
      if (linkedMatches > 0) return res.status(409).json({ message: 'เริ่มจับสายใหม่ไม่ได้เมื่อมีประวัติการแข่งขันของทีมเหล่านี้แล้ว' });
    }

    const assignments = createDrawPlan(teams, groupCount, category);
    const groupCounts = assignments.reduce((counts, assignment) => {
      counts[assignment.group] = (counts[assignment.group] || 0) + 1;
      return counts;
    }, {});
    const now = new Date();
    await prisma.drawSession.deleteMany({ where: { expiresAt: { lt: now } } });
    const session = await prisma.drawSession.create({
      data: {
        category,
        assignments,
        drawOrder: shuffleSecure(teamIds),
        drawIndex: 0,
        expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      },
    });

    return res.json({
      sessionId: session.id,
      groupCounts,
      teams: teams.map(({ id, name, category: teamCategory, logoUrl }) => ({ id, name, category: teamCategory, logoUrl })),
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  }
}

async function spinDraw(req, res, next) {
  try {
    const { sessionId } = req.body || {};
    if (typeof sessionId !== 'string' || sessionId.length < 16 || sessionId.length > 64) {
      return res.status(400).json({ message: 'รอบจับสลากไม่ถูกต้อง กรุณาเริ่มใหม่' });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const session = await transaction.drawSession.findUnique({ where: { id: sessionId } });
      if (!session) throw Object.assign(new Error('ไม่พบรอบจับสลากนี้ กรุณาเริ่มใหม่'), { statusCode: 404 });
      if (session.expiresAt <= new Date()) {
        throw Object.assign(new Error('รอบจับสลากหมดเวลาแล้ว กรุณาเริ่มใหม่'), { statusCode: 410 });
      }

      const order = Array.isArray(session.drawOrder) ? session.drawOrder : [];
      const assignments = Array.isArray(session.assignments) ? session.assignments : [];
      if (session.drawIndex >= order.length) throw Object.assign(new Error('จับครบทุกทีมแล้ว'), { statusCode: 409 });
      const teamId = Number(order[session.drawIndex]);
      const assignment = assignments.find((item) => Number(item.teamId) === teamId);
      if (!assignment) throw Object.assign(new Error('ข้อมูลรอบจับสลากไม่ครบ กรุณาเริ่มใหม่'), { statusCode: 409 });

      const claimed = await transaction.drawSession.updateMany({
        where: { id: sessionId, drawIndex: session.drawIndex },
        data: { drawIndex: { increment: 1 } },
      });
      if (claimed.count !== 1) throw Object.assign(new Error('มีการกดหมุนซ้อนกัน กรุณากดหมุนอีกครั้ง'), { statusCode: 409 });

      const team = await transaction.team.findFirst({
        where: { id: teamId, ...(session.category === 'all' ? {} : { category: session.category }) },
        select: { id: true, name: true, logoUrl: true, category: true },
      });
      if (!team) throw Object.assign(new Error('รายชื่อทีมเปลี่ยนระหว่างจับสลาก กรุณาเริ่มรอบใหม่'), { statusCode: 409 });
      return { teamId, group: assignment.group, team };
    });

    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  }
}

async function cancelDraw(req, res, next) {
  try {
    const { sessionId } = req.body || {};
    if (typeof sessionId !== 'string' || sessionId.length < 16 || sessionId.length > 64) {
      return res.status(400).json({ message: 'รอบจับสลากไม่ถูกต้อง' });
    }
    await prisma.drawSession.deleteMany({ where: { id: sessionId } });
    return res.json({ message: 'ยกเลิกรอบจับสลากแล้ว' });
  } catch (error) {
    next(error);
  }
}

// GET /api/teams/groups — get teams grouped by their group field
async function getGroups(req, res, next) {
  try {
    const teams = await prisma.team.findMany({
      where: req.query.category && req.query.category !== 'all' && ['รุ่น A', 'รุ่น B'].includes(req.query.category)
        ? { category: req.query.category }
        : {},
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });
    // Group teams by their group field
    const grouped = teams.reduce((acc, team) => {
      const g = team.group || 'Unassigned';
      if (!acc[g]) acc[g] = [];
      acc[g].push(team);
      return acc;
    }, {});
    return res.json({ groups: grouped, teams });
  } catch (error) {
    next(error);
  }
}

// POST /api/teams/draw/auto — Auto draw: randomly assign teams to groups
async function autoDraw(req, res, next) {
  try {
    const { category = 'all', groupCount = 3 } = req.body || {};
    if (!['all', 'รุ่น A', 'รุ่น B'].includes(category) || !Number.isInteger(groupCount) || groupCount < 2 || groupCount > 3) {
      return res.status(400).json({ message: 'รุ่นหรือจำนวนกลุ่มไม่ถูกต้อง' });
    }
    const where = category === 'all' ? {} : { category };
    const teams = await prisma.team.findMany({ where, orderBy: { id: 'asc' } });

    const assignments = createDrawPlan(teams, groupCount, category);
    const teamIds = assignments.map(({ teamId }) => teamId);
    await prisma.$transaction(async (transaction) => {
      const linkedMatches = await transaction.match.count({
        where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] },
      });
      if (linkedMatches > 0) throw Object.assign(new Error('เปลี่ยนสายไม่ได้เมื่อมีประวัติการแข่งขันของทีมเหล่านี้แล้ว'), { statusCode: 409 });
      const currentTeams = await transaction.team.findMany({ where: { id: { in: teamIds } } });
      const lockedError = validateLockedAssignments(currentTeams, assignments);
      if (lockedError) throw Object.assign(new Error(lockedError), { statusCode: 400 });
      for (const { teamId, group } of assignments) {
        await transaction.team.update({
          where: { id: teamId },
          data: { group },
        });
      }
    });

    // Return updated groups
    const updated = await prisma.team.findMany({
      where,
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });
    const grouped = updated.reduce((acc, team) => {
      const g = team.group || 'Unassigned';
      if (!acc[g]) acc[g] = [];
      acc[g].push(team);
      return acc;
    }, {});

    return res.json({ message: 'จับสายสำเร็จ', groups: grouped, teams: updated });
  } catch (error) {
    if (error.statusCode === 409) return res.status(409).json({ message: error.message });
    next(error);
  }
}

// POST /api/teams/draw/manual — Manual draw: assign specific teams to specific groups
async function manualDraw(req, res, next) {
  try {
    const { assignments, category = 'all', sessionId } = req.body || {};
    if (!['all', 'รุ่น A', 'รุ่น B'].includes(category)) return res.status(400).json({ message: 'รุ่นการแข่งขันไม่ถูกต้อง' });
    // assignments: [{ teamId, group }, ...]
    if (!Array.isArray(assignments) || assignments.length === 0 || assignments.length > 100) {
      return res.status(400).json({ message: 'กรุณาระบุข้อมูลการจัดสาย' });
    }

    const teamIds = assignments.map((item) => Number(item?.teamId));
    if (teamIds.some((id) => !Number.isSafeInteger(id) || id < 1) || new Set(teamIds).size !== teamIds.length) {
      return res.status(400).json({ message: 'รหัสทีมไม่ถูกต้องหรือซ้ำกัน' });
    }
    if (assignments.some((item) => item.group !== null && !['A', 'B', 'C'].includes(item.group))) {
      return res.status(400).json({ message: 'กลุ่มต้องเป็น A, B หรือ C' });
    }
    const teamsPerGroup = assignments.reduce((counts, item) => {
      if (item.group) counts[item.group] = (counts[item.group] || 0) + 1;
      return counts;
    }, {});
    if (Object.values(teamsPerGroup).some((count) => count > 4)) {
      return res.status(400).json({ message: 'แต่ละกลุ่มมีทีมได้ไม่เกิน 4 ทีม' });
    }
    const where = category === 'all' ? {} : { category };
    const result = await prisma.$transaction(async (transaction) => {
      let drawSession = null;
      if (sessionId !== undefined) {
        if (typeof sessionId !== 'string' || sessionId.length < 16 || sessionId.length > 64) {
          throw Object.assign(new Error('รอบจับสลากไม่ถูกต้อง กรุณาเริ่มใหม่'), { statusCode: 400 });
        }
        drawSession = await transaction.drawSession.findUnique({ where: { id: sessionId } });
        if (!drawSession || drawSession.expiresAt <= new Date()) {
          throw Object.assign(new Error('รอบจับสลากหมดเวลาแล้ว กรุณาเริ่มใหม่'), { statusCode: 409 });
        }
        if (drawSession.category !== category) {
          throw Object.assign(new Error('รุ่นการแข่งขันไม่ตรงกับรอบจับสลาก'), { statusCode: 409 });
        }
        const drawOrder = Array.isArray(drawSession.drawOrder) ? drawSession.drawOrder : [];
        const planned = Array.isArray(drawSession.assignments) ? drawSession.assignments : [];
        if (drawSession.drawIndex !== drawOrder.length || assignments.length !== planned.length) {
          throw Object.assign(new Error('ต้องหมุนให้ครบทุกทีมก่อนบันทึกผล'), { statusCode: 409 });
        }
        const plannedById = new Map(planned.map((item) => [Number(item.teamId), item.group]));
        if (assignments.some((item) => plannedById.get(Number(item.teamId)) !== item.group)) {
          throw Object.assign(new Error('ผลที่ส่งมาไม่ตรงกับผลการจับสลาก กรุณาเริ่มรอบใหม่'), { statusCode: 409 });
        }
      }
      const matchingTeams = await transaction.team.findMany({ where });
      const matchingIds = new Set(matchingTeams.map((team) => team.id));
      if (matchingTeams.length !== teamIds.length || teamIds.some((teamId) => !matchingIds.has(teamId))) {
        throw Object.assign(new Error('รายชื่อทีมเปลี่ยนระหว่างจับสลาก กรุณาเริ่มจับใหม่'), { statusCode: 409 });
      }
      const lockedError = validateLockedAssignments(matchingTeams, assignments);
      if (lockedError) throw Object.assign(new Error(lockedError), { statusCode: 400 });
      const linkedMatches = await transaction.match.count({ where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] } });
      if (linkedMatches > 0) throw Object.assign(new Error('เปลี่ยนสายไม่ได้เมื่อมีประวัติการแข่งขันของทีมเหล่านี้แล้ว'), { statusCode: 409 });
      const proposedTeams = matchingTeams.map((team) => ({
        ...team,
        group: assignments.find((assignment) => Number(assignment.teamId) === team.id)?.group || null,
      }));
      const canGenerateMatches = proposedTeams.every((team) => team.group);
      for (const { teamId, group } of assignments) {
        await transaction.team.update({ where: { id: Number(teamId) }, data: { group: group || null } });
      }

      let createdMatches = 0;
      if (canGenerateMatches) {
        createdMatches = await createScheduledGroupMatches(transaction, proposedTeams, category);
      }

      if (drawSession) await transaction.drawSession.delete({ where: { id: sessionId } });
      const updatedTeams = await transaction.team.findMany({ where, orderBy: [{ group: 'asc' }, { name: 'asc' }] });
      return { teams: updatedTeams, createdMatches };
    });
    const updated = result.teams;
    const grouped = updated.reduce((acc, team) => {
      const g = team.group || 'Unassigned';
      if (!acc[g]) acc[g] = [];
      acc[g].push(team);
      return acc;
    }, {});

    return res.json({
      message: result.createdMatches > 0
        ? `บันทึกผลจับสลากและสร้างโปรแกรมรอบแบ่งกลุ่ม ${result.createdMatches} แมตช์แล้ว`
        : 'บันทึกการจัดสายสำเร็จ',
      groups: grouped,
      teams: updated,
      createdMatches: result.createdMatches,
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  }
}

// POST /api/teams/draw/reset — Clear all group assignments
async function resetDraw(req, res, next) {
  try {
    const { category = 'all' } = req.body || {};
    if (!['all', 'รุ่น A', 'รุ่น B'].includes(category)) return res.status(400).json({ message: 'รุ่นการแข่งขันไม่ถูกต้อง' });
    const where = category === 'all' ? {} : { category };
    await prisma.$transaction(async (transaction) => {
      const groupedTeams = await transaction.team.findMany({ where, select: { id: true } });
      const teamIds = groupedTeams.map((team) => team.id);
      const linkedMatches = await transaction.match.count({ where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] } });
      if (linkedMatches > 0) throw Object.assign(new Error('รีเซ็ตกลุ่มไม่ได้เพราะมีประวัติการแข่งขันที่อ้างอิงทีมเหล่านี้'), { statusCode: 409 });
      await transaction.team.updateMany({ where, data: { group: null } });
    });
    return res.json({ message: 'รีเซ็ตการจัดสายสำเร็จ' });
  } catch (error) {
    if (error.statusCode === 409) return res.status(409).json({ message: error.message });
    next(error);
  }
}

module.exports = { getGroups, prepareDraw, spinDraw, cancelDraw, autoDraw, manualDraw, generateGroupStageMatches, resetDraw };
