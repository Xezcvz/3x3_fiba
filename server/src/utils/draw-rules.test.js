const test = require('node:test');
const assert = require('node:assert/strict');
const { createDrawPlan, validateLockedAssignments, LOCKED_U18_TEAMS } = require('./draw-rules');

function makeTeams(names, category = 'รุ่น A') {
  return names.map((name, index) => ({ id: index + 1, name, category }));
}

test('draw plans are complete, balanced, capped at four and respect the locked U18 group', () => {
  const teams = makeTeams([...LOCKED_U18_TEAMS, ...Array.from({ length: 8 }, (_, index) => `U18 Team ${index + 5}`)]);
  const plan = createDrawPlan(teams, 3, 'รุ่น A');
  assert.equal(plan.length, 12);
  assert.equal(new Set(plan.map(({ teamId }) => teamId)).size, 12);

  const counts = plan.reduce((result, { group }) => ({ ...result, [group]: (result[group] || 0) + 1 }), {});
  assert.deepEqual(Object.values(counts).sort(), [4, 4, 4]);

  const lockedGroupSet = new Set(teams.slice(0, 4).map((team) => plan.find((item) => item.teamId === team.id).group));
  assert.equal(lockedGroupSet.size, 1);
  assert.equal(validateLockedAssignments(teams, plan), null);
});

test('draw plan rejects incomplete locked roster and overloaded groups', () => {
  assert.throws(() => createDrawPlan(makeTeams([LOCKED_U18_TEAMS[0], 'Other']), 2, 'รุ่น A'), /เพิ่มทีมที่ล็อกให้ครบ/);
  assert.throws(() => createDrawPlan(makeTeams(Array.from({ length: 9 }, (_, index) => `Team ${index}`)), 2, 'รุ่น A'), /ไม่เกิน 4 ทีม/);
});

test('draw plan works normally when Hae Chi is not registered yet', () => {
  const teams = makeTeams(['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5']);
  assert.equal(createDrawPlan(teams, 2, 'รุ่น A').length, teams.length);
});

test('manual assignments cannot split the locked teams', () => {
  const teams = makeTeams([...LOCKED_U18_TEAMS]);
  const assignments = teams.map(({ id }, index) => ({ teamId: id, group: index === 3 ? 'B' : 'A' }));
  assert.match(validateLockedAssignments(teams, assignments), /ต้องอยู่สายเดียวกัน/);
});

test('locked draw still works with eight teams by reserving one four-team group', () => {
  const teams = makeTeams([...LOCKED_U18_TEAMS, 'Team 5', 'Team 6', 'Team 7', 'Team 8']);
  const plan = createDrawPlan(teams, 3, 'รุ่น A');
  const counts = plan.reduce((result, { group }) => ({ ...result, [group]: (result[group] || 0) + 1 }), {});
  assert.deepEqual(Object.values(counts).sort(), [2, 2, 4]);
  assert.equal(validateLockedAssignments(teams, plan), null);
});
