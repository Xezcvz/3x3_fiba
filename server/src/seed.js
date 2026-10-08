require('dotenv').config();
const prisma = require('./prisma');

const DIVISIONS = [
  {
    category: 'รุ่น A',
    groups: {
      A: ['NVC Dragons', 'Red Bulls 3×3', 'Bangkok Slammers', 'Cyber Knights'],
      B: ['NVC Hawks', 'Blue Waves 3×3', 'Chiang Mai Tigers', 'Korat Vipers'],
      C: ['NVC Lions', 'Phuket Storm', 'Gold Warriors', 'Nonthaburi Sparks'],
    },
  },
  {
    category: 'รุ่น B',
    groups: {
      A: ['NVC Junior A', 'Slam Dunkers', 'Young Gunz', 'Dunk Kings'],
      B: ['NVC Rising', 'Fast Break 3×3', 'North Stars', 'Iron Giants'],
      C: ['NVC Thunder', 'Velocity 3×3', 'South Coast', 'Urban Ballers'],
    },
  },
];

const ROUND_ROBIN_PAIRS = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
const VENUES = ['สนาม 1', 'สนาม 2'];
const MATCH_INTERVAL_MS = 15 * 60 * 1000;

function getScheduleStart() {
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  if (start <= new Date()) start.setDate(start.getDate() + 1);
  return start;
}

async function seedTournamentIfEmpty() {
  const existingTeamCount = await prisma.team.count();
  const existingMatchCount = await prisma.match.count();
  if (existingTeamCount > 0 || existingMatchCount > 0) {
    console.log('ℹ️ Existing tournament data found; seed skipped to protect current data.');
    return;
  }

  const startDate = getScheduleStart();
  let matchIndex = 0;

  for (const division of DIVISIONS) {
    for (const [groupName, teamNames] of Object.entries(division.groups)) {
      const teams = [];
      for (const name of teamNames) {
        teams.push(await prisma.team.create({
          data: {
            name,
            category: division.category,
            group: groupName,
            city: 'นครปฐม',
            coach: 'ผู้ฝึกสอน ' + name.split(' ')[0],
            description: 'ทีมบาสเกตบอล 3×3 รุ่น ' + division.category + ' กลุ่ม ' + groupName,
          },
        }));
      }

      for (const [homeIndex, awayIndex] of ROUND_ROBIN_PAIRS) {
        const slot = Math.floor(matchIndex / VENUES.length);
        const matchDate = new Date(startDate.getTime() + slot * MATCH_INTERVAL_MS);
        await prisma.match.create({
          data: {
            homeTeamId: teams[homeIndex].id,
            awayTeamId: teams[awayIndex].id,
            category: division.category,
            round: 'รอบแบ่งกลุ่ม กลุ่ม ' + groupName,
            venue: VENUES[matchIndex % VENUES.length],
            matchDate,
            status: 'upcoming',
          },
        });
        matchIndex += 1;
      }
    }
  }

  console.log('✅ Seeded 24 teams and 36 group-stage matches.');
}

async function seedNewsIfEmpty() {
  if ((await prisma.news.count()) > 0) return;

  const news = [
    {
      title: 'เตรียมพบการแข่งขัน NVC 3×3 Basketball Club Tournament',
      category: 'ประกาศ',
      content: 'ติดตามตารางแข่งขัน ผลคะแนน และข่าวสารของทีมทั้งรุ่น A และรุ่น B ได้ที่เว็บไซต์การแข่งขัน',
    },
    {
      title: 'รูปแบบการแข่งขันรอบแบ่งกลุ่ม',
      category: 'ระเบียบการ',
      content: 'แต่ละรุ่นมี 3 กลุ่ม กลุ่มละ 4 ทีม แข่งขันแบบพบกันหมด และคัดเลือกทีมเข้าสู่รอบน็อกเอาต์ตามระเบียบการแข่งขัน',
    },
  ];

  await prisma.news.createMany({ data: news });
  console.log('✅ Seeded tournament announcements.');
}

async function seed() {
  await seedTournamentIfEmpty();
  await seedNewsIfEmpty();
  console.log('🎉 Seeding completed. Create the first administrator separately with npm run admin:create.');
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
