const prisma = require('../prisma');

async function getStats(req, res, next) {
  try {
    const [teamCount, totalMatches, upcomingMatches, liveMatches, finishedMatches, newsCount] = await Promise.all([
      prisma.team.count(),
      prisma.match.count(),
      prisma.match.count({ where: { status: 'upcoming' } }),
      prisma.match.count({ where: { status: 'live' } }),
      prisma.match.count({ where: { status: 'finished' } }),
      prisma.news.count(),
    ]);

    return res.json({
      teamCount,
      totalMatches,
      upcomingMatches,
      liveMatches,
      finishedMatches,
      newsCount,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStats,
};
