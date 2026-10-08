const MATCH_SLOT_MS = 15 * 60 * 1000;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

function getTomorrowAtNineBangkok(now = new Date()) {
  const bangkokNow = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  return new Date(Date.UTC(
    bangkokNow.getUTCFullYear(),
    bangkokNow.getUTCMonth(),
    bangkokNow.getUTCDate() + 1,
    2,
    0,
    0,
  ));
}

function createGroupStageRounds(teams) {
  const grouped = teams.reduce((groups, team) => {
    if (!team.group) return groups;
    const key = `${team.category || ''}::${team.group}`;
    (groups[key] ||= []).push(team);
    return groups;
  }, {});

  const rounds = [];
  for (const [key, groupTeams] of Object.entries(grouped).sort(([left], [right]) => left.localeCompare(right))) {
    if (groupTeams.length < 2) continue;
    const group = groupTeams[0].group;
    const category = groupTeams[0].category;
    // Circle rotation creates every pairing once, with no team playing twice in a round.
    const rotation = [...groupTeams];
    if (rotation.length % 2 === 1) rotation.push(null);
    for (let round = 0; round < rotation.length - 1; round += 1) {
      const fixtures = [];
      for (let index = 0; index < rotation.length / 2; index += 1) {
        const home = rotation[index];
        const away = rotation[rotation.length - 1 - index];
        if (home && away) fixtures.push({ category, group, groupRound: round, homeTeamId: home.id, awayTeamId: away.id });
      }
      rounds[round] = [...(rounds[round] || []), ...fixtures];
      rotation.splice(1, 0, rotation.pop());
    }
  }
  return rounds.flat();
}

module.exports = { MATCH_SLOT_MS, getTomorrowAtNineBangkok, createGroupStageRounds };
