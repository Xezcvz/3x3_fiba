const { randomInt } = require('node:crypto');

const LOCKED_U18_TEAMS = [
  'Hae Chi',
  'อ้ายส่งสุดเเขนเขาแทงสุดโคน',
  'ปีศาจหมูรวมฝูง',
  'WinterFell',
];

function shuffleSecure(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function createDrawPlan(teams, groupCount, category) {
  if (!Number.isInteger(groupCount) || groupCount < 2 || groupCount > 3) {
    throw Object.assign(new Error('จำนวนสายไม่ถูกต้อง'), { statusCode: 400 });
  }
  if (teams.length === 0) throw Object.assign(new Error('ไม่มีทีมในระบบ'), { statusCode: 400 });
  if (teams.length > groupCount * 4) {
    throw Object.assign(new Error('จำนวนทีมเกินรูปแบบกลุ่ม (ไม่เกิน 4 ทีมต่อกลุ่ม)'), { statusCode: 400 });
  }

  const labels = Array.from({ length: groupCount }, (_, index) => String.fromCharCode(65 + index));
  let capacity;
  const assignment = new Map();
  let remaining = [...teams];
  const normalizedName = (name) => name.normalize('NFC').trim().toLocaleLowerCase('th-TH');
  const lockedNames = LOCKED_U18_TEAMS.map(normalizedName);
  const isU18 = category !== 'รุ่น B' && teams.some((team) => team.category === 'รุ่น A');
  const lockedTeams = isU18
    ? lockedNames.map((name) => teams.find((team) => normalizedName(team.name) === name)).filter(Boolean)
    : [];

  if (lockedTeams.some((team) => normalizedName(team.name) === lockedNames[0]) && lockedTeams.length !== lockedNames.length) {
    const missing = LOCKED_U18_TEAMS.filter((name) => !lockedTeams.some((team) => normalizedName(team.name) === normalizedName(name)));
    throw Object.assign(new Error(`เพิ่มทีมที่ล็อกให้ครบก่อนจับสลาก: ${missing.join(', ')}`), { statusCode: 400 });
  }

  if (lockedTeams.length === lockedNames.length) {
    const lockedGroup = shuffleSecure(labels)[0];
    lockedTeams.forEach((team) => assignment.set(team.id, lockedGroup));
    const lockedIds = new Set(lockedTeams.map((team) => team.id));
    remaining = remaining.filter((team) => !lockedIds.has(team.id));

    const otherGroups = shuffleSecure(labels.filter((label) => label !== lockedGroup));
    const teamsPerOtherGroup = Math.floor(remaining.length / otherGroups.length);
    const extraSeats = remaining.length % otherGroups.length;
    const groupsWithExtraSeat = new Set(otherGroups.slice(0, extraSeats));
    capacity = Object.fromEntries(labels.map((label) => [
      label,
      label === lockedGroup ? 0 : teamsPerOtherGroup + Number(groupsWithExtraSeat.has(label)),
    ]));
  } else {
    capacity = Object.fromEntries(labels.map((label) => [label, Math.ceil(teams.length / groupCount)]));
    // Remove extra seats from randomly selected groups to balance the final draw.
    const extraSeats = groupCount * Math.ceil(teams.length / groupCount) - teams.length;
    shuffleSecure(labels).slice(0, extraSeats).forEach((label) => { capacity[label] -= 1; });
  }

  const openSlots = shuffleSecure(labels.flatMap((label) => Array(capacity[label]).fill(label)));
  remaining = shuffleSecure(remaining);
  const entries = remaining.map((team, index) => [team.id, openSlots[index]]);
  entries.forEach(([teamId, label]) => assignment.set(teamId, label));

  return shuffleSecure(teams).map((team) => ({
    teamId: team.id,
    group: assignment.get(team.id),
  }));
}

function validateLockedAssignments(teams, assignments) {
  const normalizedName = (name) => name.normalize('NFC').trim().toLocaleLowerCase('th-TH');
  const u18Teams = teams.filter((team) => team.category === 'รุ่น A');
  const lockedTeams = LOCKED_U18_TEAMS.map((name) =>
    u18Teams.find((team) => normalizedName(team.name) === normalizedName(name))
  ).filter(Boolean);
  if (!lockedTeams.some((team) => normalizedName(team.name) === normalizedName(LOCKED_U18_TEAMS[0]))) return null;
  if (lockedTeams.length !== LOCKED_U18_TEAMS.length) {
    const missing = LOCKED_U18_TEAMS.filter((name) => !lockedTeams.some((team) => normalizedName(team.name) === normalizedName(name)));
    return `เพิ่มทีมที่ล็อกให้ครบก่อนจับสลาก: ${missing.join(', ')}`;
  }
  const groupById = new Map(assignments.map(({ teamId, group }) => [Number(teamId), group]));
  const lockedGroups = new Set(lockedTeams.map((team) => groupById.get(team.id)));
  return lockedGroups.size === 1 && !lockedGroups.has(null) && !lockedGroups.has(undefined)
    ? null
    : 'ทีม Hae Chi และทีมที่ล็อกทั้ง 3 ทีมต้องอยู่สายเดียวกัน';
}

module.exports = { LOCKED_U18_TEAMS, shuffleSecure, createDrawPlan, validateLockedAssignments };
