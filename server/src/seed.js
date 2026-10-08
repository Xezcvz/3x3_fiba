require('dotenv').config();
const prisma = require('./prisma');
const { DIVISIONS } = require('./data/tournament-roster');

async function seedTournamentIfEmpty() {
  const existingTeamCount = await prisma.team.count();
  const existingMatchCount = await prisma.match.count();
  if (existingTeamCount > 0 || existingMatchCount > 0) {
    console.log('ℹ️ Existing tournament data found; seed skipped to protect current data.');
    return;
  }

  for (const division of DIVISIONS) {
    for (const name of division.teams) {
      await prisma.team.create({
        data: {
          name,
          category: division.category,
          group: null,
          city: 'นครปฐม',
          coach: '',
          description: '',
        },
      });
    }
  }

  console.log('✅ Seeded 24 tournament teams with no group assignments or match history.');
}

async function seedNewsIfEmpty() {
  if ((await prisma.news.count()) > 0) return;

  const news = [
    {
      title: 'เตรียมพบการแข่งขัน NVC 3×3 Basketball Club Tournament',
      category: 'ประกาศ',
      content: 'ติดตามตารางแข่งขัน ผลคะแนน และข่าวสารของทีมทั้งรุ่น U18 และรุ่นบุคคลภายนอกได้ที่เว็บไซต์การแข่งขัน',
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
