const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSharedPlayerSchedule } = require('./scheduling-constraints');

test('same-time matches for shared players are rejected across divisions', async () => {
  const fakePrisma = {
    team: { findFirst: async () => ({ id: 9, name: 'Hunter Hoop A' }) },
    match: { findFirst: async ({ where }) => ({
      id: 1,
      matchDate: where.matchDate,
      homeTeam: { name: 'Hunter Hoop A' },
      awayTeam: { name: 'Other team' },
    }) },
  };
  const message = await validateSharedPlayerSchedule(fakePrisma, {
    teams: [{ id: 1, name: 'HTH x กินเส้นไรรามยอน', category: 'รุ่น B' }],
    matchDate: new Date('2026-10-08T12:00:00Z'),
  });
  assert.match(message, /HTH x กินเส้นไรรามยอน/);
  assert.match(message, /Hunter Hoop A/);
});

test('same match updates do not conflict with themselves', async () => {
  let capturedWhere;
  const fakePrisma = {
    team: { findFirst: async () => ({ id: 9, name: 'สุดสาครPT' }) },
    match: { findFirst: async ({ where }) => { capturedWhere = where; return null; } },
  };
  const message = await validateSharedPlayerSchedule(fakePrisma, {
    teams: [{ id: 2, name: 'Hae Chi', category: 'รุ่น A' }],
    matchDate: new Date('2026-10-08T12:00:00Z'),
    excludeMatchId: 77,
  });
  assert.equal(message, null);
  assert.deepEqual(capturedWhere.id, { not: 77 });
});

test('unrelated teams do not trigger a shared-player lookup', async () => {
  let lookupCount = 0;
  const fakePrisma = {
    team: { findFirst: async () => { lookupCount += 1; return null; } },
    match: { findFirst: async () => null },
  };
  assert.equal(await validateSharedPlayerSchedule(fakePrisma, {
    teams: [{ id: 1, name: 'Unrelated', category: 'รุ่น A' }],
    matchDate: new Date(),
  }), null);
  assert.equal(lookupCount, 0);
});
