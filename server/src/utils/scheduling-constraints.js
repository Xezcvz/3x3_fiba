const SHARED_PLAYER_PAIRS = [
  {
    first: { category: 'รุ่น B', name: 'HTH x กินเส้นไรรามยอน' },
    second: { category: 'รุ่น A', name: 'Hunter Hoop A' },
    message: 'HTH x กินเส้นไรรามยอน (บุคคลภายนอก) ต้องไม่แข่งขันเวลาเดียวกับ Hunter Hoop A (U18)',
  },
  {
    first: { category: 'รุ่น A', name: 'Hae Chi' },
    second: { category: 'รุ่น B', name: 'สุดสาครPT' },
    message: 'Hae Chi (U18) ต้องไม่แข่งขันเวลาเดียวกับ สุดสาครPT (บุคคลภายนอก)',
  },
];

function normalizeName(name) {
  return name.normalize('NFC').trim().toLocaleLowerCase('th-TH');
}

function sharedOpponent(team) {
  for (const pair of SHARED_PLAYER_PAIRS) {
    if (pair.first.category === team.category && normalizeName(pair.first.name) === normalizeName(team.name)) {
      return { ...pair.second, message: pair.message };
    }
    if (pair.second.category === team.category && normalizeName(pair.second.name) === normalizeName(team.name)) {
      return { ...pair.first, message: pair.message };
    }
  }
  return null;
}

async function validateSharedPlayerSchedule(transaction, { teams, matchDate, excludeMatchId }) {
  const date = matchDate instanceof Date ? matchDate : new Date(matchDate);
  const candidates = teams.filter(Boolean);
  for (const team of candidates) {
    const opponent = sharedOpponent(team);
    if (!opponent) continue;

    const opponentTeam = await transaction.team.findFirst({
      where: { category: opponent.category, name: { equals: opponent.name, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
    if (!opponentTeam) continue;

    const conflictingMatch = await transaction.match.findFirst({
      where: {
        matchDate: date,
        ...(excludeMatchId ? { id: { not: excludeMatchId } } : {}),
        OR: [{ homeTeamId: opponentTeam.id }, { awayTeamId: opponentTeam.id }],
      },
      include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
    });
    if (conflictingMatch) return `${opponent.message} (อีกแมตช์: ${conflictingMatch.homeTeam.name} พบ ${conflictingMatch.awayTeam.name})`;
  }
  return null;
}

module.exports = { SHARED_PLAYER_PAIRS, normalizeName, validateSharedPlayerSchedule };
