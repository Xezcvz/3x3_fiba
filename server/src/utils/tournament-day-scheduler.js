const { createGroupStageRounds, MATCH_SLOT_MS } = require('./group-stage-schedule');
const { SHARED_PLAYER_PAIRS, normalizeName } = require('./scheduling-constraints');

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const COURTS = ['สนาม 1', 'สนาม 2'];

function createBangkokDateTime(date, time) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) return null;

  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day
    || hour > 23
    || minute > 59
  ) return null;

  return new Date(Date.UTC(year, month - 1, day, hour, minute) - BANGKOK_OFFSET_MS);
}

function matchPairKey(category, group, firstId, secondId) {
  return `${category}::${group}::${Math.min(firstId, secondId)}::${Math.max(firstId, secondId)}`;
}

function getRoundPriority(matches) {
  const teams = new Map();
  for (const match of matches) {
    if (match.homeTeam) teams.set(match.homeTeam.id, match.homeTeam);
    if (match.awayTeam) teams.set(match.awayTeam.id, match.awayTeam);
  }

  const priority = new Map();
  for (const fixture of createGroupStageRounds([...teams.values()])) {
    priority.set(
      matchPairKey(fixture.category, fixture.group, fixture.homeTeamId, fixture.awayTeamId),
      fixture.groupRound,
    );
  }
  return priority;
}

function createSharedPlayerLinks(matches) {
  const teamByName = new Map();
  for (const match of matches) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (team) teamByName.set(`${team.category}::${normalizeName(team.name)}`, team.id);
    }
  }

  const links = new Map();
  for (const pair of SHARED_PLAYER_PAIRS) {
    const firstId = teamByName.get(`${pair.first.category}::${normalizeName(pair.first.name)}`);
    const secondId = teamByName.get(`${pair.second.category}::${normalizeName(pair.second.name)}`);
    if (firstId && secondId) {
      links.set(firstId, secondId);
      links.set(secondId, firstId);
    }
  }
  return links;
}

function matchTeamIds(match) {
  return [match.homeTeamId, match.awayTeamId].filter(Number.isInteger);
}

function stagePriority(match) {
  if (match.round?.includes('รอบแบ่งกลุ่ม')) return 0;
  if (match.round?.includes('รอบ 8 ทีม') || match.round?.includes('QF')) return 1;
  if (match.round?.includes('รองชนะเลิศ') || match.round?.includes('SF')) return 2;
  return 3;
}

function buildSchedule(matches, startAt) {
  const groupRoundPriority = getRoundPriority(matches);
  const sharedPlayerLinks = createSharedPlayerLinks(matches);
  const sortedMatches = [...matches].sort((left, right) => {
    const leftStage = stagePriority(left);
    const rightStage = stagePriority(right);
    if (leftStage !== rightStage) return leftStage - rightStage;

    if (leftStage === 0) {
      const leftGroupRound = groupRoundPriority.get(matchPairKey(
        left.category, left.homeTeam?.group || left.awayTeam?.group || '', left.homeTeamId, left.awayTeamId,
      )) ?? 99;
      const rightGroupRound = groupRoundPriority.get(matchPairKey(
        right.category, right.homeTeam?.group || right.awayTeam?.group || '', right.homeTeamId, right.awayTeamId,
      )) ?? 99;
      if (leftGroupRound !== rightGroupRound) return leftGroupRound - rightGroupRound;
    }
    return left.id - right.id;
  });

  const schedule = [];
  let slot = 0;
  let lastStage = null;
  let lastGroupRound = null;

  for (const match of sortedMatches) {
    const stage = stagePriority(match);
    const groupRound = stage === 0
      ? groupRoundPriority.get(matchPairKey(
        match.category, match.homeTeam?.group || match.awayTeam?.group || '', match.homeTeamId, match.awayTeamId,
      )) ?? 99
      : null;

    if (lastStage !== null && (stage !== lastStage || (stage === 0 && groupRound !== lastGroupRound))) {
      const latestSlot = schedule.reduce((latest, item) => Math.max(latest, item.slot), -1);
      slot = Math.max(slot, latestSlot + 2); // Leave a 15-minute recovery break between rounds.
    }

    const teamIds = matchTeamIds(match);
    let candidateSlot = slot;
    while (true) {
      const simultaneous = schedule.filter((item) => item.slot === candidateSlot);
      const sameTeam = simultaneous.some((item) => item.teamIds.some((id) => teamIds.includes(id)));
      const sharedPlayerConflict = simultaneous.some((item) => item.teamIds.some((id) => (
        teamIds.some((candidateId) => sharedPlayerLinks.get(id) === candidateId)
      )));
      if (!sameTeam && !sharedPlayerConflict && simultaneous.length < COURTS.length) break;
      candidateSlot += 1;
    }

    const simultaneous = schedule.filter((item) => item.slot === candidateSlot);
    schedule.push({
      id: match.id,
      slot: candidateSlot,
      teamIds,
      venue: COURTS[simultaneous.length],
      matchDate: new Date(startAt.getTime() + candidateSlot * MATCH_SLOT_MS),
    });
    slot = candidateSlot;
    lastStage = stage;
    lastGroupRound = groupRound;
  }

  return schedule;
}

module.exports = { buildSchedule, createBangkokDateTime };
