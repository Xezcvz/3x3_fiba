function scoringAverage(team) {
  return team.stats.played > 0 ? team.stats.pointsFor / team.stats.played : 0;
}

// FIBA 3x3 pool ranking: wins, head-to-head wins among tied teams, then points scored on average.
function rankPoolTeams(teams, matches) {
  const ranked = [];
  const byWins = [...teams].sort((a, b) => b.stats.won - a.stats.won);

  for (let start = 0; start < byWins.length;) {
    let end = start + 1;
    while (end < byWins.length && byWins[end].stats.won === byWins[start].stats.won) end++;
    const tied = byWins.slice(start, end);
    const tiedIds = new Set(tied.map((team) => team.id));
    const headToHeadWins = new Map(tied.map((team) => [team.id, 0]));

    for (const match of matches) {
      if (match.round && !match.round.includes('รอบแบ่งกลุ่ม') && !match.round.includes('กลุ่ม') && !match.round.includes('สาย') && !match.round.includes('Pool')) continue;
      if (match.status !== 'finished' || match.homeScore == null || match.awayScore == null) continue;
      if (!tiedIds.has(match.homeTeamId) || !tiedIds.has(match.awayTeamId)) continue;
      if (match.homeScore > match.awayScore) headToHeadWins.set(match.homeTeamId, headToHeadWins.get(match.homeTeamId) + 1);
      if (match.awayScore > match.homeScore) headToHeadWins.set(match.awayTeamId, headToHeadWins.get(match.awayTeamId) + 1);
    }

    tied.sort((a, b) => {
      const headToHeadDifference = headToHeadWins.get(b.id) - headToHeadWins.get(a.id);
      if (headToHeadDifference !== 0) return headToHeadDifference;
      const averageDifference = scoringAverage(b) - scoringAverage(a);
      return averageDifference || a.name.localeCompare(b.name);
    });
    ranked.push(...tied.map((team) => ({ ...team, stats: { ...team.stats, h2hWins: headToHeadWins.get(team.id), scoringAverage: scoringAverage(team) } })));
    start = end;
  }

  return ranked.map((team, index) => ({ ...team, rankInGroup: index + 1 }));
}

// Across pools, head-to-head does not apply. Use wins/win ratio, then scoring average.
function compareAcrossPools(a, b) {
  const aRatio = a.stats.played ? a.stats.won / a.stats.played : 0;
  const bRatio = b.stats.played ? b.stats.won / b.stats.played : 0;
  if (bRatio !== aRatio) return bRatio - aRatio;
  const averageDifference = scoringAverage(b) - scoringAverage(a);
  return averageDifference || a.name.localeCompare(b.name);
}

module.exports = { rankPoolTeams, compareAcrossPools };
