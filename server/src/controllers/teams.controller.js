const prisma = require('../prisma');
const { z } = require('zod');

const teamSchema = z.object({
  name: z.string().trim().min(1).max(80),
  logoUrl: z.union([z.literal(''), z.string().url().max(500)]).optional(),
  category: z.enum(['รุ่น A', 'รุ่น B']),
  group: z.enum(['A', 'B', 'C']),
  coach: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  description: z.string().trim().max(1500).optional(),
}).strict();

function parseTeamInput(body, partial = false) {
  const parsed = (partial ? teamSchema.partial() : teamSchema).safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'ข้อมูลทีมไม่ถูกต้อง' };
  }
  return { data: parsed.data };
}

async function getTeams(req, res, next) {
  try {
    const { group, category } = req.query;
    const where = {};
    if (group && group !== 'all') {
      if (!['A', 'B', 'C'].includes(group)) return res.status(400).json({ message: 'กลุ่มการแข่งขันไม่ถูกต้อง' });
      where.group = group;
    }
    if (category && category !== 'all') {
      if (!['รุ่น A', 'รุ่น B'].includes(category)) return res.status(400).json({ message: 'รุ่นการแข่งขันไม่ถูกต้อง' });
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
            round: true,
          }
        },
        awayMatches: {
          select: {
            id: true,
            homeScore: true,
            awayScore: true,
            status: true,
            round: true,
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
        if (m.status === 'finished' && m.homeScore !== null && m.awayScore !== null && (!m.round || m.round.includes('รอบแบ่งกลุ่ม') || m.round.includes('กลุ่ม') || m.round.includes('Pool'))) {
          played++;
          pointsFor += m.homeScore;
          pointsAgainst += m.awayScore;
          if (m.homeScore > m.awayScore) won++;
          else lost++;
        }
      });

      // Away matches
      team.awayMatches.forEach((m) => {
        if (m.status === 'finished' && m.homeScore !== null && m.awayScore !== null && (!m.round || m.round.includes('รอบแบ่งกลุ่ม') || m.round.includes('กลุ่ม') || m.round.includes('Pool'))) {
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
        category: team.category || 'รุ่น A',
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
    const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : NaN;
    if (!Number.isSafeInteger(id) || id < 1) {
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
    const parsed = parseTeamInput({
      ...req.body,
      category: req.body?.category || 'รุ่น A',
      group: req.body?.group || 'A',
    });
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    const data = parsed.data;

    const currentCategoryCount = await prisma.team.count({ where: { category: data.category } });
    const existingInGroup = await prisma.team.count({ where: { category: data.category, group: data.group } });
    if (currentCategoryCount >= 12 || (currentCategoryCount >= 4 && existingInGroup >= 4)) {
      return res.status(409).json({ message: 'รุ่นนี้หรือกลุ่มนี้มีทีมครบตามรูปแบบการแข่งขันแล้ว' });
    }

    const duplicate = await prisma.team.findFirst({
      where: { name: data.name, category: data.category },
      select: { id: true },
    });
    if (duplicate) return res.status(409).json({ message: 'มีชื่อทีมนี้ในรุ่นดังกล่าวแล้ว' });

    const newTeam = await prisma.team.create({
      data: {
        name: data.name,
        logoUrl: data.logoUrl || '',
        category: data.category,
        group: data.group,
        coach: data.coach || '',
        city: data.city || '',
        description: data.description || '',
      }
    });

    return res.status(201).json({ message: 'เพิ่มทีมสำเร็จ', team: newTeam });
  } catch (error) {
    next(error);
  }
}

async function updateTeam(req, res, next) {
  try {
    const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : NaN;
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const parsed = parseTeamInput(req.body, true);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    if (Object.keys(parsed.data).length === 0) return res.status(400).json({ message: 'กรุณาระบุข้อมูลที่ต้องการแก้ไข' });

    const current = await prisma.team.findUnique({ where: { id }, select: { id: true, category: true } });
    if (!current) return res.status(404).json({ message: 'ไม่พบทีมที่ต้องการแก้ไข' });
    const duplicateName = parsed.data.name
      ? await prisma.team.findFirst({ where: { id: { not: id }, name: parsed.data.name, category: parsed.data.category || current.category }, select: { id: true } })
      : null;
    if (duplicateName) return res.status(409).json({ message: 'มีชื่อทีมนี้ในรุ่นดังกล่าวแล้ว' });
    if (parsed.data.category && parsed.data.category !== current.category) {
      const linkedMatches = await prisma.match.count({
        where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
      });
      if (linkedMatches > 0) return res.status(409).json({ message: 'ย้ายรุ่นไม่ได้เมื่อทีมมีประวัติการแข่งขันแล้ว' });
    }
    if (parsed.data.group) {
      const currentGroup = await prisma.team.findUnique({ where: { id }, select: { group: true } });
      if (parsed.data.group !== currentGroup.group) {
        const linkedMatches = await prisma.match.count({ where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] } });
        if (linkedMatches > 0) return res.status(409).json({ message: 'เปลี่ยนกลุ่มไม่ได้เมื่อทีมมีประวัติการแข่งขันแล้ว' });
      }
    }
    if (parsed.data.group) {
      const nextCategory = parsed.data.category || current.category;
      const currentGroup = await prisma.team.findUnique({ where: { id }, select: { group: true } });
      if (parsed.data.group !== currentGroup.group || nextCategory !== current.category) {
        const groupCount = await prisma.team.count({ where: { id: { not: id }, category: nextCategory, group: parsed.data.group } });
        if (groupCount >= 4) return res.status(409).json({ message: 'กลุ่มนี้มีครบ 4 ทีมแล้ว' });
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: parsed.data,
    });

    return res.json({ message: 'แก้ไขข้อมูลทีมสำเร็จ', team: updatedTeam });
  } catch (error) {
    next(error);
  }
}

async function deleteTeam(req, res, next) {
  try {
    const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : NaN;
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid team ID' });
    }

    const linkedMatches = await prisma.match.count({
      where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
    });
    if (linkedMatches > 0) {
      return res.status(409).json({ message: 'ลบทีมไม่ได้เพราะมีประวัติการแข่งขัน กรุณาเก็บประวัติไว้หรือจัดการแมตช์ก่อน' });
    }

    await prisma.team.delete({ where: { id } });

    return res.json({ message: 'ลบทีมเรียบร้อยแล้ว' });
  } catch (error) {
    next(error);
  }
}

// POST /api/teams/reset-all
// Refuses to remove teams when match history is linked to them.
async function resetAllTeams(req, res, next) {
  try {
    const { category } = req.body || {};
    if (category !== 'all' && category !== 'รุ่น A' && category !== 'รุ่น B') {
      return res.status(400).json({ message: 'กรุณาระบุรุ่นที่ต้องการล้างข้อมูล' });
    }
    const where = {};
    if (category && category !== 'all') {
      where.category = category;
    }

    const deleted = await prisma.$transaction(async (transaction) => {
      const teams = await transaction.team.findMany({ where, select: { id: true } });
      const teamIds = teams.map((team) => team.id);
      const linkedMatches = await transaction.match.count({
        where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] },
      });
      if (linkedMatches > 0) throw Object.assign(new Error('ล้างข้อมูลทีมไม่ได้เพราะมีประวัติการแข่งขัน'), { statusCode: 409 });
      return transaction.team.deleteMany({ where });
    });

    return res.json({
      message: `ล้างข้อมูลทีมสำเร็จ (ลบ ${deleted.count} ทีม)`,
      count: deleted.count,
    });
  } catch (error) {
    if (error.statusCode === 409) return res.status(409).json({ message: error.message });
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
