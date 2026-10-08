const prisma = require('../prisma');
const crypto = require('node:crypto');
const { DIVISIONS } = require('../data/tournament-roster');

async function getSnapshot(transaction) {
  const [teams, matches] = await Promise.all([
    transaction.team.findMany({
      select: { id: true, name: true, category: true, group: true },
      orderBy: { id: 'asc' },
    }),
    transaction.match.findMany({
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        category: true,
        homeScore: true,
        awayScore: true,
        matchDate: true,
        status: true,
        round: true,
        venue: true,
      },
      orderBy: { id: 'asc' },
    }),
  ]);
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ teams, matches })).digest('hex');
  return { teams, matches, fingerprint };
}

async function getRosterResetPreview(req, res, next) {
  try {
    const snapshot = await getSnapshot(prisma);
    return res.json({
      resetToken: snapshot.fingerprint,
      teamCount: snapshot.teams.length,
      teamCounts: Object.fromEntries(DIVISIONS.map(({ category, teams }) => [category, teams.length])),
      matchCount: snapshot.matches.length,
      matchesWithScores: snapshot.matches.filter((match) => match.homeScore !== null || match.awayScore !== null).length,
      finishedMatches: snapshot.matches.filter((match) => match.status === 'finished').length,
      officialTeamCount: DIVISIONS.reduce((total, division) => total + division.teams.length, 0),
    });
  } catch (error) {
    next(error);
  }
}

async function resetToOfficialRoster(req, res, next) {
  try {
    const { resetToken } = req.body || {};
    if (typeof resetToken !== 'string' || !/^[a-f0-9]{64}$/.test(resetToken)) {
      return res.status(400).json({ message: 'ข้อมูลยืนยันการรีเซ็ตไม่ถูกต้อง กรุณาโหลดหน้าต่างยืนยันใหม่' });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const snapshot = await getSnapshot(transaction);
      if (snapshot.fingerprint !== resetToken) {
        throw Object.assign(new Error('ข้อมูลการแข่งขันเปลี่ยนหลังจากเปิดหน้าต่างยืนยัน กรุณาลองกดรีเซ็ตอีกครั้ง'), { statusCode: 409 });
      }

      const deletedMatches = await transaction.match.deleteMany({});
      const deletedTeams = await transaction.team.deleteMany({});
      await transaction.drawSession.deleteMany({});

      for (const division of DIVISIONS) {
        await transaction.team.createMany({
          data: division.teams.map((name) => ({
            name,
            category: division.category,
            group: null,
            city: 'นครปฐม',
            coach: '',
            description: '',
          })),
        });
      }

      return { deletedMatches: deletedMatches.count, deletedTeams: deletedTeams.count };
    }, { isolationLevel: 'Serializable' });

    return res.json({
      message: 'รีเซ็ตข้อมูลตัวอย่างและโหลดรายชื่อทีมจริงเรียบร้อยแล้ว',
      ...result,
      createdTeams: DIVISIONS.reduce((total, division) => total + division.teams.length, 0),
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    if (error.code === 'P2034') return res.status(409).json({ message: 'มีข้อมูลเปลี่ยนระหว่างรีเซ็ต กรุณาโหลดหน้าต่างยืนยันใหม่แล้วลองอีกครั้ง' });
    next(error);
  }
}

module.exports = { getRosterResetPreview, resetToOfficialRoster };
