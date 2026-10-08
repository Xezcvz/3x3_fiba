const prisma = require('../prisma');
const { createDrawPlan, validateLockedAssignments } = require('../utils/draw-rules');

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
    return res.json({ assignments, teams: teams.map(({ id, name, category: teamCategory, logoUrl }) => ({ id, name, category: teamCategory, logoUrl })) });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
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
    const { assignments, category = 'all' } = req.body || {};
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
    const updated = await prisma.$transaction(async (transaction) => {
      const matchingTeams = await transaction.team.findMany({ where });
      const matchingIds = new Set(matchingTeams.map((team) => team.id));
      if (matchingTeams.length !== teamIds.length || teamIds.some((teamId) => !matchingIds.has(teamId))) {
        throw Object.assign(new Error('รายชื่อทีมเปลี่ยนระหว่างจับสลาก กรุณาเริ่มจับใหม่'), { statusCode: 409 });
      }
      const lockedError = validateLockedAssignments(matchingTeams, assignments);
      if (lockedError) throw Object.assign(new Error(lockedError), { statusCode: 400 });
      const linkedMatches = await transaction.match.count({ where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] } });
      if (linkedMatches > 0) throw Object.assign(new Error('เปลี่ยนสายไม่ได้เมื่อมีประวัติการแข่งขันของทีมเหล่านี้แล้ว'), { statusCode: 409 });
      for (const { teamId, group } of assignments) {
        await transaction.team.update({ where: { id: Number(teamId) }, data: { group: group || null } });
      }
      return transaction.team.findMany({ where, orderBy: [{ group: 'asc' }, { name: 'asc' }] });
    });
    const grouped = updated.reduce((acc, team) => {
      const g = team.group || 'Unassigned';
      if (!acc[g]) acc[g] = [];
      acc[g].push(team);
      return acc;
    }, {});

    return res.json({ message: 'บันทึกการจัดสายสำเร็จ', groups: grouped, teams: updated });
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

module.exports = { getGroups, prepareDraw, autoDraw, manualDraw, resetDraw };
