const prisma = require('../prisma');

async function getTeams(req, res, next) {
  try {
    const { group, category } = req.query;
    const where = {};
    if (group && group !== 'all') {
      where.group = group;
    }
    if (category && category !== 'all') {
      where.category = category;
    }

    const teams = await prisma.team.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { group: 'asc' },
        { name: 'asc' },
      ],
      include: {
        homeMatches: {
          select: {
            id: true,
            homeScore: true,
            awayScore: true,
            status: true,
          }
        },
        awayMatches: {
          select: {
            id: true,
            homeScore: true,
            awayScore: true,
            status: true,
          }
        },
      }
    });

    // Calculate standings/stats for each team
    const teamsWithStats = teams.map((team) => {
      let played = 0;
      let won = 0;
      let lost = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;

      // Home matches
      team.homeMatches.forEach((m) => {
        if (m.status === 'finished' && m.homeScore !== null && m.awayScore !== null) {
          played++;
          pointsFor += m.homeScore;
          pointsAgainst += m.awayScore;
          if (m.homeScore > m.awayScore) won++;
          else lost++;
        }
      });

      // Away matches
      team.awayMatches.forEach((m) => {
        if (m.status === 'finished' && m.homeScore !== null && m.awayScore !== null) {
          played++;
          pointsFor += m.awayScore;
          pointsAgainst += m.homeScore;
          if (m.awayScore > m.homeScore) won++;
          else lost++;
        }
      });

      const totalMatches = team.homeMatches.length + team.awayMatches.length;

      return {
        id: team.id,
        name: team.name,
        logoUrl: team.logoUrl,
        group: team.group,
        coach: team.coach,
        city: team.city,
        description: team.description,
        createdAt: team.createdAt,
        stats: {
          played,
          won,
          lost,
          pointsFor,
          pointsAgainst,
          diff: pointsFor - pointsAgainst,
          pts: won * 2 + lost * 1, // standard basketball league points (2 for win, 1 for loss)
          totalMatches,
        }
      };
    });

    return res.json(teamsWithStats);
  } catch (error) {
    next(error);
  }
}

async function getTeamById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        homeMatches: {
          include: {
            awayTeam: {
              select: { id: true, name: true, logoUrl: true, group: true },
            }
          },
          orderBy: { matchDate: 'asc' }
        },
        awayMatches: {
          include: {
            homeTeam: {
              select: { id: true, name: true, logoUrl: true, group: true },
            }
          },
          orderBy: { matchDate: 'asc' }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ message: 'ไม่พบทีมนี้ในระบบ' });
    }

    // Combine matches
    const allMatches = [
      ...team.homeMatches.map(m => ({ ...m, isHome: true, opponent: m.awayTeam })),
      ...team.awayMatches.map(m => ({ ...m, isHome: false, opponent: m.homeTeam })),
    ].sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));

    return res.json({
      ...team,
      matches: allMatches,
    });
  } catch (error) {
    next(error);
  }
}

async function createTeam(req, res, next) {
  try {
    const { name, logoUrl, category, group, coach, city, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อทีม' });
    }

    const newTeam = await prisma.team.create({
      data: {
        name: name.trim(),
        logoUrl: logoUrl || '',
        category: category || 'รุ่น A',
        group: group || 'A',
        coach: coach || '',
        city: city || '',
        description: description || '',
      }
    });

    return res.status(201).json({ message: 'เพิ่มทีมสำเร็จ', team: newTeam });
  } catch (error) {
    next(error);
  }
}

async function updateTeam(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const { name, logoUrl, category, group, coach, city, description } = req.body;

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        category: category !== undefined ? category : undefined,
        group: group !== undefined ? group : undefined,
        coach: coach !== undefined ? coach : undefined,
        city: city !== undefined ? city : undefined,
        description: description !== undefined ? description : undefined,
      }
    });

    return res.json({ message: 'แก้ไขข้อมูลทีมสำเร็จ', team: updatedTeam });
  } catch (error) {
    next(error);
  }
}

async function deleteTeam(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    await prisma.team.delete({
      where: { id },
    });

    return res.json({ message: 'ลบทีมเรียบร้อยแล้ว' });
  } catch (error) {
    next(error);
  }
}

// POST /api/teams/reset-all
// Deletes all teams (and their matches cascade-deleted)
async function resetAllTeams(req, res, next) {
  try {
    const { category } = req.body || {};
    const where = {};
    if (category && category !== 'all') {
      where.category = category;
    }

    const deleted = await prisma.team.deleteMany({ where });

    return res.json({
      message: `ล้างข้อมูลทีมสำเร็จ (ลบ ${deleted.count} ทีม)`,
      count: deleted.count,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  resetAllTeams,
};
