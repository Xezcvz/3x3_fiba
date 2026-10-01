const prisma = require('../prisma');

// GET /api/teams/groups — get teams grouped by their group field
async function getGroups(req, res, next) {
  try {
    const teams = await prisma.team.findMany({
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
    const { groupCount = 2, groupLabels } = req.body;
    const teams = await prisma.team.findMany({ orderBy: { id: 'asc' } });

    if (teams.length === 0) {
      return res.status(400).json({ message: 'ไม่มีทีมในระบบ' });
    }

    // Shuffle teams (Fisher–Yates)
    const shuffled = [...teams];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Default group labels: A, B, C, D ...
    const labels = groupLabels || Array.from({ length: groupCount }, (_, i) =>
      String.fromCharCode(65 + i) // A, B, C, D
    );

    // Assign teams round-robin to groups
    const updates = shuffled.map((team, idx) =>
      prisma.team.update({
        where: { id: team.id },
        data: { group: labels[idx % labels.length] },
      })
    );

    await prisma.$transaction(updates);

    // Return updated groups
    const updated = await prisma.team.findMany({
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
    next(error);
  }
}

// POST /api/teams/draw/manual — Manual draw: assign specific teams to specific groups
async function manualDraw(req, res, next) {
  try {
    const { assignments } = req.body;
    // assignments: [{ teamId, group }, ...]
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ message: 'กรุณาระบุข้อมูลการจัดสาย' });
    }

    const updates = assignments.map(({ teamId, group }) =>
      prisma.team.update({
        where: { id: Number(teamId) },
        data: { group: group || null },
      })
    );

    await prisma.$transaction(updates);

    const updated = await prisma.team.findMany({
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });
    const grouped = updated.reduce((acc, team) => {
      const g = team.group || 'Unassigned';
      if (!acc[g]) acc[g] = [];
      acc[g].push(team);
      return acc;
    }, {});

    return res.json({ message: 'บันทึกการจัดสายสำเร็จ', groups: grouped, teams: updated });
  } catch (error) {
    next(error);
  }
}

// POST /api/teams/draw/reset — Clear all group assignments
async function resetDraw(req, res, next) {
  try {
    await prisma.team.updateMany({ data: { group: null } });
    return res.json({ message: 'รีเซ็ตการจัดสายสำเร็จ' });
  } catch (error) {
    next(error);
  }
}

module.exports = { getGroups, autoDraw, manualDraw, resetDraw };
