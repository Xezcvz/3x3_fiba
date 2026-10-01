const prisma = require('../prisma');

// Helper to compute team standings in groups for a given category (division)
async function computeGroupStandings(category = 'รุ่น A') {
  const where = {};
  if (category && category !== 'all') {
    where.category = category;
  }

  const teams = await prisma.team.findMany({
    where,
    include: {
      homeMatches: {
        select: { id: true, homeScore: true, awayScore: true, status: true, round: true, category: true },
      },
      awayMatches: {
        select: { id: true, homeScore: true, awayScore: true, status: true, round: true, category: true },
      },
    },
    orderBy: [{ group: 'asc' }, { name: 'asc' }],
  });

  const grouped = {};

  teams.forEach((team) => {
    const g = team.group || 'Unassigned';
    if (!grouped[g]) grouped[g] = [];

    let played = 0;
    let won = 0;
    let lost = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;

    // Only count group stage matches for group standings
    const isGroupMatch = (m) =>
      !m.round ||
      m.round.includes('รอบแบ่งกลุ่ม') ||
      m.round.includes('กลุ่ม') ||
      m.round.includes('สาย') ||
      m.round.includes('Pool');

    team.homeMatches.forEach((m) => {
      if (m.status === 'finished' && m.homeScore !== null && m.awayScore !== null && isGroupMatch(m)) {
        played++;
        pointsFor += m.homeScore;
        pointsAgainst += m.awayScore;
        if (m.homeScore > m.awayScore) won++;
        else lost++;
      }
    });

    team.awayMatches.forEach((m) => {
      if (m.status === 'finished' && m.homeScore !== null && m.awayScore !== null && isGroupMatch(m)) {
        played++;
        pointsFor += m.awayScore;
        pointsAgainst += m.homeScore;
        if (m.awayScore > m.homeScore) won++;
        else lost++;
      }
    });

    grouped[g].push({
      id: team.id,
      name: team.name,
      logoUrl: team.logoUrl,
      category: team.category || 'รุ่น A',
      group: team.group,
      city: team.city,
      coach: team.coach,
      stats: {
        played,
        won,
        lost,
        pointsFor,
        pointsAgainst,
        diff: pointsFor - pointsAgainst,
        pts: won * 2 + lost * 1, // Standard 3x3 / basketball ranking points
      },
    });
  });

  // Sort each group: Points desc, Diff desc, PointsFor desc, Name asc
  const sortedGroups = {};
  for (const [groupName, groupTeams] of Object.entries(grouped)) {
    groupTeams.sort((a, b) => {
      if (b.stats.pts !== a.stats.pts) return b.stats.pts - a.stats.pts;
      if (b.stats.diff !== a.stats.diff) return b.stats.diff - a.stats.diff;
      if (b.stats.pointsFor !== a.stats.pointsFor) return b.stats.pointsFor - a.stats.pointsFor;
      return a.name.localeCompare(b.name);
    });

    sortedGroups[groupName] = groupTeams.map((team, idx) => ({
      ...team,
      rankInGroup: idx + 1,
      seedLabel: `${groupName}${idx + 1}`,
    }));
  }

  // Calculate 8 Qualified teams:
  // 1) 3 Group Winners (อันดับ 1 ของกลุ่ม A, B, C)
  // 2) 3 Group Runners-up (อันดับ 2 ของกลุ่ม A, B, C)
  // 3) 2 Best 3rd-place teams (อันดับ 3 ที่ดีที่สุด 2 จาก 3 กลุ่ม)
  const validPools = ['A', 'B', 'C'].filter((p) => sortedGroups[p] && sortedGroups[p].length > 0);

  const thirdPlaceTeams = [];
  validPools.forEach((p) => {
    const t = sortedGroups[p][2]; // 3rd place
    if (t) thirdPlaceTeams.push(t);
  });

  // Sort 3rd place teams among each other
  thirdPlaceTeams.sort((a, b) => {
    if (b.stats.pts !== a.stats.pts) return b.stats.pts - a.stats.pts;
    if (b.stats.diff !== a.stats.diff) return b.stats.diff - a.stats.diff;
    if (b.stats.pointsFor !== a.stats.pointsFor) return b.stats.pointsFor - a.stats.pointsFor;
    return a.name.localeCompare(b.name);
  });

  const qualifiedBest3rdIds = new Set(thirdPlaceTeams.slice(0, 2).map((t) => t.id));

  // Mark qualification status on all teams
  const finalGroups = {};
  const qualifiedList = [];

  for (const [groupName, groupTeams] of Object.entries(sortedGroups)) {
    finalGroups[groupName] = groupTeams.map((team) => {
      let qualified = false;
      let qualifyReason = 'ตกรอบ';

      if (team.rankInGroup === 1) {
        qualified = true;
        qualifyReason = 'แชมป์กลุ่ม (อันดับ 1)';
      } else if (team.rankInGroup === 2) {
        qualified = true;
        qualifyReason = 'รองแชมป์กลุ่ม (อันดับ 2)';
      } else if (team.rankInGroup === 3 && qualifiedBest3rdIds.has(team.id)) {
        qualified = true;
        qualifyReason = 'อันดับ 3 ที่ดีที่สุด';
      }

      const teamObj = { ...team, qualified, qualifyReason };
      if (qualified) qualifiedList.push(teamObj);
      return teamObj;
    });
  }

  return {
    groups: finalGroups,
    thirdPlaceComparison: thirdPlaceTeams.map((t, idx) => ({
      ...t,
      rankAmong3rd: idx + 1,
      isQualified: qualifiedBest3rdIds.has(t.id),
    })),
    qualifiedTeams: qualifiedList,
  };
}

// GET /api/tournament/bracket?category=รุ่น+A
async function getTournamentBracket(req, res, next) {
  try {
    const category = req.query.category || 'รุ่น A';
    const { groups, thirdPlaceComparison, qualifiedTeams } = await computeGroupStandings(category);

    const where = {};
    if (category && category !== 'all') {
      where.category = category;
    }

    // Fetch matches for this division
    const allMatches = await prisma.match.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: [{ matchDate: 'asc' }],
    });

    const parsedMatches = allMatches.map((m) => {
      let quarters = null;
      if (m.quarterScores) {
        try { quarters = JSON.parse(m.quarterScores); } catch (e) { quarters = null; }
      }
      return { ...m, quarterScoresObj: quarters };
    });

    // Categorize knockout matches: 8-Team, Semifinals, Final, 3rd Place
    const qf = parsedMatches.filter(
      (m) => m.round && (m.round.includes('รอบ 8 ทีม') || m.round.includes('ก่อนรอง') || m.round.includes('QF'))
    );
    const sf = parsedMatches.filter(
      (m) => m.round && (m.round.includes('รองชนะเลิศ') && !m.round.includes('ก่อน') || m.round.includes('SF'))
    );
    const final = parsedMatches.filter(
      (m) => m.round && (m.round.includes('ชิงชนะเลิศ') && !m.round.includes('รอง') && !m.round.includes('3') || m.round.includes('Final') && !m.round.includes('Semi'))
    );
    const thirdPlace = parsedMatches.filter(
      (m) => m.round && (m.round.includes('อันดับ 3') || m.round.includes('3rd'))
    );
    const groupMatches = parsedMatches.filter(
      (m) => !m.round || m.round.includes('กลุ่ม') || m.round.includes('สาย') || m.round.includes('Pool')
    );

    return res.json({
      category,
      standings: groups,
      thirdPlaceComparison,
      qualifiedTeams,
      groupMatches,
      bracket: {
        qf,
        sf,
        final,
        thirdPlace,
      },
      summary: {
        totalMatches: allMatches.length,
        groupMatchesCount: groupMatches.length,
        knockoutMatchesCount: qf.length + sf.length + final.length + thirdPlace.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/tournament/generate-knockout
// Creates 4 Quarter-final matches + SF + Final + 3rd place for the 8 qualified teams
async function generateKnockoutMatches(req, res, next) {
  try {
    const { category = 'รุ่น A' } = req.body;
    const { groups, qualifiedTeams, thirdPlaceComparison } = await computeGroupStandings(category);

    if (qualifiedTeams.length < 8) {
      return res.status(400).json({
        message: `มีทีมเข้ารอบเพียง ${qualifiedTeams.length} ทีม (ต้องการ 8 ทีม เพื่อจัดรอบ 8 ทีม)`,
      });
    }

    // Check if knockout already generated for this category
    const existing = await prisma.match.findMany({
      where: {
        category,
        OR: [
          { round: { contains: 'รอบ 8 ทีม' } },
          { round: { contains: 'รองชนะเลิศ' } },
          { round: { contains: 'ชิงชนะเลิศ' } },
        ],
      },
    });

    if (existing.length > 0) {
      return res.status(400).json({
        message: `มีการสร้างรอบน็อกเอาต์ของ ${category} ไว้แล้ว (${existing.length} แมตช์)`,
      });
    }

    // 1st place teams from A, B, C
    const a1 = groups['A']?.[0];
    const b1 = groups['B']?.[0];
    const c1 = groups['C']?.[0];

    // 2nd place teams from A, B, C
    const a2 = groups['A']?.[1];
    const b2 = groups['B']?.[1];
    const c2 = groups['C']?.[1];

    // Best 3rd place teams (top 2 from thirdPlaceComparison)
    const best3rd_1 = thirdPlaceComparison[0];
    const best3rd_2 = thirdPlaceComparison[1];

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const createdMatches = [];

    // FIBA 3x3 8-Team Knockout Bracket Pairings (Alternating Court 1 and Court 2):
    // QF 1: A1 vs Best 3rd #2 (สนาม 1)
    // QF 2: B2 vs C2 (สนาม 2)
    // QF 3: B1 vs Best 3rd #1 (สนาม 1)
    // QF 4: C1 vs A2 (สนาม 2)
    const qfPairings = [
      { h: a1, a: best3rd_2, venue: 'สนาม 1', timeOffset: 13, label: `รอบ 8 ทีม คู่ที่ 1 (${category}: A1 vs อันดับ 3)` },
      { h: b2, a: c2, venue: 'สนาม 2', timeOffset: 13.25, label: `รอบ 8 ทีม คู่ที่ 2 (${category}: B2 vs C2)` },
      { h: b1, a: best3rd_1, venue: 'สนาม 1', timeOffset: 13.5, label: `รอบ 8 ทีม คู่ที่ 3 (${category}: B1 vs อันดับ 3)` },
      { h: c1, a: a2, venue: 'สนาม 2', timeOffset: 13.75, label: `รอบ 8 ทีม คู่ที่ 4 (${category}: C1 vs A2)` },
    ];

    for (const p of qfPairings) {
      const match = await prisma.match.create({
        data: {
          homeTeamId: p.h.id,
          awayTeamId: p.a.id,
          category,
          round: p.label,
          venue: p.venue,
          matchDate: new Date(tomorrow.getTime() + p.timeOffset * 60 * 60 * 1000),
          status: 'upcoming',
        },
        include: { homeTeam: true, awayTeam: true },
      });
      createdMatches.push(match);
    }

    // Template SF 1 (Winner QF1 vs Winner QF2) — สนาม 1
    const sf1 = await prisma.match.create({
      data: {
        homeTeamId: a1.id,
        awayTeamId: b2.id,
        category,
        round: `รอบรองชนะเลิศ SF 1 (${category}: ชนะ QF1 vs ชนะ QF2)`,
        venue: 'สนาม 1',
        matchDate: new Date(tomorrow.getTime() + 15 * 60 * 60 * 1000),
        status: 'upcoming',
      },
      include: { homeTeam: true, awayTeam: true },
    });
    createdMatches.push(sf1);

    // Template SF 2 (Winner QF3 vs Winner QF4) — สนาม 2
    const sf2 = await prisma.match.create({
      data: {
        homeTeamId: b1.id,
        awayTeamId: c1.id,
        category,
        round: `รอบรองชนะเลิศ SF 2 (${category}: ชนะ QF3 vs ชนะ QF4)`,
        venue: 'สนาม 2',
        matchDate: new Date(tomorrow.getTime() + 15.5 * 60 * 60 * 1000),
        status: 'upcoming',
      },
      include: { homeTeam: true, awayTeam: true },
    });
    createdMatches.push(sf2);

    // Template 3rd Place Match — สนาม 2
    const thirdMatch = await prisma.match.create({
      data: {
        homeTeamId: a1.id,
        awayTeamId: b1.id,
        category,
        round: `ชิงอันดับ 3 (${category}: แพ้ SF1 vs แพ้ SF2)`,
        venue: 'สนาม 2',
        matchDate: new Date(tomorrow.getTime() + 17 * 60 * 60 * 1000),
        status: 'upcoming',
      },
      include: { homeTeam: true, awayTeam: true },
    });
    createdMatches.push(thirdMatch);

    // Template Final Match — สนาม 1
    const finalMatch = await prisma.match.create({
      data: {
        homeTeamId: a1.id,
        awayTeamId: b1.id,
        category,
        round: `ชิงชนะเลิศ (${category}: ชนะ SF1 vs ชนะ SF2)`,
        venue: 'สนาม 1',
        matchDate: new Date(tomorrow.getTime() + 17.5 * 60 * 60 * 1000),
        status: 'upcoming',
      },
      include: { homeTeam: true, awayTeam: true },
    });
    createdMatches.push(finalMatch);

    return res.json({
      message: `สร้างรอบ 8 ทีม, รองชนะเลิศ, ชิงที่ 3, และชิงชนะเลิศของ ${category} สำเร็จ (${createdMatches.length} แมตช์)`,
      matches: createdMatches,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/tournament/advance-winner
// Advances the winner of a completed knockout match to the next round
async function advanceKnockoutWinner(req, res, next) {
  try {
    const { matchId } = req.body;
    if (!matchId) return res.status(400).json({ message: 'กรุณาระบุ matchId' });

    const match = await prisma.match.findUnique({
      where: { id: Number(matchId) },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!match || match.status !== 'finished' || match.homeScore === null || match.awayScore === null) {
      return res.status(400).json({ message: 'แมตช์นี้ยังแข่งไม่จบ หรือยังไม่มีผลคะแนน' });
    }

    const winner = match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam;
    const loser = match.homeScore > match.awayScore ? match.awayTeam : match.homeTeam;
    let updatedNext = null;

    // 1) If QF finished: advance winner into Semi-Final
    if (match.round && (match.round.includes('รอบ 8 ทีม') || match.round.includes('QF'))) {
      const isQF1 = match.round.includes('คู่ที่ 1') || match.round.includes('QF 1');
      const isQF2 = match.round.includes('คู่ที่ 2') || match.round.includes('QF 2');
      const isQF3 = match.round.includes('คู่ที่ 3') || match.round.includes('QF 3');
      const isQF4 = match.round.includes('คู่ที่ 4') || match.round.includes('QF 4');

      if (isQF1 || isQF2) {
        const sf1 = await prisma.match.findFirst({
          where: { category: match.category, round: { contains: 'SF 1' } },
        });
        if (sf1) {
          updatedNext = await prisma.match.update({
            where: { id: sf1.id },
            data: isQF1 ? { homeTeamId: winner.id } : { awayTeamId: winner.id },
            include: { homeTeam: true, awayTeam: true },
          });
        }
      } else if (isQF3 || isQF4) {
        const sf2 = await prisma.match.findFirst({
          where: { category: match.category, round: { contains: 'SF 2' } },
        });
        if (sf2) {
          updatedNext = await prisma.match.update({
            where: { id: sf2.id },
            data: isQF3 ? { homeTeamId: winner.id } : { awayTeamId: winner.id },
            include: { homeTeam: true, awayTeam: true },
          });
        }
      }
    }

    // 2) If SF finished: advance winner to Final, loser to 3rd place
    else if (match.round && match.round.includes('รองชนะเลิศ') && !match.round.includes('ก่อน')) {
      const isSF1 = match.round.includes('SF 1') || match.round.includes('คู่ที่ 1');

      // Final match
      const finalMatch = await prisma.match.findFirst({
        where: {
          category: match.category,
          round: { contains: 'ชิงชนะเลิศ' },
          NOT: { round: { contains: 'รอง' } },
        },
      });

      if (finalMatch) {
        updatedNext = await prisma.match.update({
          where: { id: finalMatch.id },
          data: isSF1 ? { homeTeamId: winner.id } : { awayTeamId: winner.id },
          include: { homeTeam: true, awayTeam: true },
        });
      }

      // 3rd place match
      const thirdMatch = await prisma.match.findFirst({
        where: {
          category: match.category,
          round: { contains: 'อันดับ 3' },
        },
      });

      if (thirdMatch) {
        await prisma.match.update({
          where: { id: thirdMatch.id },
          data: isSF1 ? { homeTeamId: loser.id } : { awayTeamId: loser.id },
        });
      }
    }

    return res.json({
      message: `ทีม ${winner.name} ชนะและได้สิทธิ์เข้ารอบต่อไป!`,
      winner,
      loser,
      nextMatch: updatedNext,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/tournament/seed-24
// Quickly seeds the exact 24-team, 2-division, 3-group, 2-court format specified by user
async function seedTournament24(req, res, next) {
  try {
    // 24 teams structure
    const divisions = [
      {
        name: 'รุ่น A',
        groups: {
          A: ['NVC Dragons', 'Red Bulls 3×3', 'Bangkok Slammers', 'Cyber Knights'],
          B: ['NVC Hawks', 'Blue Waves 3×3', 'Chiang Mai Tigers', 'Korat Vipers'],
          C: ['NVC Lions', 'Phuket Storm', 'Gold Warriors', 'Nonthaburi Sparks'],
        },
      },
      {
        name: 'รุ่น B',
        groups: {
          A: ['NVC Junior A', 'Slam Dunkers', 'Young Gunz', 'Dunk Kings'],
          B: ['NVC Rising', 'Fast Break 3×3', 'North Stars', 'Iron Giants'],
          C: ['NVC Thunder', 'Velocity 3×3', 'South Coast', 'Urban Ballers'],
        },
      },
    ];

    let createdTeamsCount = 0;
    let createdMatchesCount = 0;

    const baseDate = new Date();
    baseDate.setHours(9, 0, 0, 0); // Start at 09:00 AM

    for (const div of divisions) {
      let gameIndex = 0;

      for (const [groupName, teamNames] of Object.entries(div.groups)) {
        // Create teams
        const groupTeamRecords = [];
        for (const tName of teamNames) {
          let team = await prisma.team.findFirst({
            where: { name: tName, category: div.name },
          });
          if (!team) {
            team = await prisma.team.create({
              data: {
                name: tName,
                category: div.name,
                group: groupName,
                city: 'นครปฐม',
                coach: `โค้ช ${tName.split(' ')[0]}`,
                description: `ทีมแข่งขันบาสเกตบอล 3×3 ${div.name} กลุ่ม ${groupName}`,
              },
            });
            createdTeamsCount++;
          }
          groupTeamRecords.push(team);
        }

        // Generate round robin matches (4 teams = 6 games)
        // Pairs: (0,1), (2,3), (0,2), (1,3), (0,3), (1,2)
        const roundRobinPairs = [
          [0, 1], [2, 3],
          [0, 2], [1, 3],
          [0, 3], [1, 2],
        ];

        for (const [i, j] of roundRobinPairs) {
          const homeT = groupTeamRecords[i];
          const awayT = groupTeamRecords[j];

          // Check if match already exists
          const exists = await prisma.match.findFirst({
            where: {
              category: div.name,
              homeTeamId: homeT.id,
              awayTeamId: awayT.id,
              round: `รอบแบ่งกลุ่ม กลุ่ม ${groupName}`,
            },
          });

          if (!exists) {
            // Alternate between สนาม 1 and สนาม 2
            const venue = gameIndex % 2 === 0 ? 'สนาม 1' : 'สนาม 2';
            // 15 minutes between matches (10 min game + 5 min warm-up/switch)
            const matchTime = new Date(baseDate.getTime() + gameIndex * 15 * 60 * 1000);

            await prisma.match.create({
              data: {
                homeTeamId: homeT.id,
                awayTeamId: awayT.id,
                category: div.name,
                round: `รอบแบ่งกลุ่ม กลุ่ม ${groupName}`,
                venue,
                matchDate: matchTime,
                status: 'upcoming',
              },
            });
            createdMatchesCount++;
          }
          gameIndex++;
        }
      }
    }

    return res.json({
      message: `สร้างโครงสร้างทัวร์นาเมนต์ 24 ทีม (2 รุ่น, 3 กลุ่ม/รุ่น, 2 สนาม) สำเร็จ!`,
      createdTeams: createdTeamsCount,
      createdMatches: createdMatchesCount,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  computeGroupStandings,
  getTournamentBracket,
  generateKnockoutMatches,
  advanceKnockoutWinner,
  seedTournament24,
};
