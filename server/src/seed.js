require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

async function seed() {
  console.log('🌱 Starting database seeding...');

  // 1. Create or update default Admin
  const existingAdmin = await prisma.admin.findUnique({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: 'หัวหน้าผู้ตัดสินและการแข่งขัน (Admin)',
      },
    });
    console.log('✅ Admin user created: admin / admin123');
  } else {
    console.log('ℹ️ Admin user already exists');
  }

  // 2. Teams
  const teamCount = await prisma.team.count();
  if (teamCount === 0) {
    const teamsData = [
      {
        name: 'Bangkok Warriors',
        logoUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=150&auto=format&fit=crop&q=80',
        group: 'A',
        coach: 'โค้ชมานพ ชัยชนะ',
        city: 'กรุงเทพมหานคร',
        description: 'แชมป์เก่า 2 สมัย โดดเด่นด้วยเกมรุกที่ดุดันและการยิง 3 คะแนนที่แม่นยำ',
      },
      {
        name: 'Chiang Mai Highlands',
        logoUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=150&auto=format&fit=crop&q=80',
        group: 'A',
        coach: 'โค้ชเดวิด มิลเลอร์',
        city: 'เชียงใหม่',
        description: 'ทีมพลังหนุ่มจากแดนเหนือ เล่นฟาสต์เบรกเร็วและเกมรับเหนียวแน่น',
      },
      {
        name: 'Korat Cobras',
        logoUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=150&auto=format&fit=crop&q=80',
        group: 'A',
        coach: 'โค้ชประเสริฐ วงศ์ใหญ่',
        city: 'นครราชสีมา',
        description: 'ทีมจอมอึดแห่งที่ราบสูง ผู้เล่นมีรูปร่างสูงใหญ่ ครองรีบาวด์อันดับหนึ่ง',
      },
      {
        name: 'Songkhla Sea Angels',
        logoUrl: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=150&auto=format&fit=crop&q=80',
        group: 'A',
        coach: 'โค้ชธนพล สุขสม',
        city: 'สงขลา',
        description: 'ทีมหัวใจสู้จากภาคใต้ เชี่ยวชาญการต่อบอลและการตัดบอลเร็ว',
      },
      {
        name: 'Phuket Waves',
        logoUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=150&auto=format&fit=crop&q=80',
        group: 'B',
        coach: 'โค้ชจอห์น สมิธ',
        city: 'ภูเก็ต',
        description: 'ทีมขวัญใจแฟนบอลแดนใต้ มีผู้เล่นระดับอินเตอร์และเกมป้องกันวงในที่ยอดเยี่ยม',
      },
      {
        name: 'Khon Kaen Dinosaurs',
        logoUrl: 'https://images.unsplash.com/photo-1505666287802-931dc83948e9?w=150&auto=format&fit=crop&q=80',
        group: 'B',
        coach: 'โค้ชสมศักดิ์ ภักดี',
        city: 'ขอนแก่น',
        description: 'ทีมสปิริตสูง มีมือยิงระยะกลางยอดเยี่ยมและกองเชียร์ที่เหนียวแน่นที่สุด',
      },
      {
        name: 'Chonburi Sharks',
        logoUrl: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=150&auto=format&fit=crop&q=80',
        group: 'B',
        coach: 'โค้ชวรวุฒิ สิงห์โต',
        city: 'ชลบุรี',
        description: 'ฉลามบุกแห่งชายฝั่งตะวันออก โจมตีใต้แป้นอย่างทรงพลัง',
      },
      {
        name: 'Nonthaburi Titans',
        logoUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=150&auto=format&fit=crop&q=80',
        group: 'B',
        coach: 'โค้ชกิตติคุณ นนทรี',
        city: 'นนทบุรี',
        description: 'ทีมหน้าใหม่ไฟแรงที่สร้างเซอร์ไพรส์ด้วยระบบทีมเวิร์กที่ยอดเยี่ยม',
      },
    ];

    const createdTeams = [];
    for (const t of teamsData) {
      const created = await prisma.team.create({ data: t });
      createdTeams.push(created);
    }
    console.log(`✅ Seeded ${createdTeams.length} teams`);

    // 3. Matches
    const t = createdTeams;
    const now = new Date();
    
    // Finished matches
    await prisma.match.create({
      data: {
        homeTeamId: t[0].id, // Bangkok Warriors
        awayTeamId: t[1].id, // Chiang Mai Highlands
        homeScore: 88,
        awayScore: 82,
        status: 'finished',
        round: 'รอบแบ่งกลุ่ม สาย A',
        venue: 'ยิมเนเซียม 1 อาคารนิมิบุตร ปทุมวัน',
        matchDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        quarterScores: JSON.stringify({
          q1Home: 22, q1Away: 18,
          q2Home: 20, q2Away: 24,
          q3Home: 24, q3Away: 19,
          q4Home: 22, q4Away: 21,
        }),
      },
    });

    await prisma.match.create({
      data: {
        homeTeamId: t[2].id, // Korat Cobras
        awayTeamId: t[3].id, // Songkhla Sea Angels
        homeScore: 76,
        awayScore: 70,
        status: 'finished',
        round: 'รอบแบ่งกลุ่ม สาย A',
        venue: 'สนามกีฬาเฉลิมพระเกียรติ 80 พรรษา โคราช',
        matchDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        quarterScores: JSON.stringify({
          q1Home: 19, q1Away: 16,
          q2Home: 18, q2Away: 20,
          q3Home: 17, q3Away: 15,
          q4Home: 22, q4Away: 19,
        }),
      },
    });

    await prisma.match.create({
      data: {
        homeTeamId: t[4].id, // Phuket Waves
        awayTeamId: t[5].id, // Khon Kaen Dinosaurs
        homeScore: 92,
        awayScore: 85,
        status: 'finished',
        round: 'รอบแบ่งกลุ่ม สาย B',
        venue: 'ศูนย์กีฬาสะพานหิน ภูเก็ต',
        matchDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        quarterScores: JSON.stringify({
          q1Home: 25, q1Away: 20,
          q2Home: 22, q2Away: 23,
          q3Home: 21, q3Away: 21,
          q4Home: 24, q4Away: 21,
        }),
      },
    });

    // LIVE match
    await prisma.match.create({
      data: {
        homeTeamId: t[6].id, // Chonburi Sharks
        awayTeamId: t[7].id, // Nonthaburi Titans
        homeScore: 68,
        awayScore: 65,
        status: 'live',
        round: 'รอบแบ่งกลุ่ม สาย B',
        venue: 'สนามกีฬาศูนย์เยาวชนเทศบาลเมืองชลบุรี',
        matchDate: new Date(), // Today
        quarterScores: JSON.stringify({
          q1Home: 20, q1Away: 22,
          q2Home: 24, q2Away: 19,
          q3Home: 24, q3Away: 24,
          q4Home: 0, q4Away: 0,
        }),
      },
    });

    // Upcoming matches
    await prisma.match.create({
      data: {
        homeTeamId: t[0].id, // Bangkok Warriors
        awayTeamId: t[2].id, // Korat Cobras
        homeScore: null,
        awayScore: null,
        status: 'upcoming',
        round: 'รอบแบ่งกลุ่ม สาย A',
        venue: 'ยิมเนเซียม 1 อาคารนิมิบุตร ปทุมวัน',
        matchDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // Tomorrow 17:00
      },
    });

    await prisma.match.create({
      data: {
        homeTeamId: t[1].id, // Chiang Mai Highlands
        awayTeamId: t[3].id, // Songkhla Sea Angels
        homeScore: null,
        awayScore: null,
        status: 'upcoming',
        round: 'รอบแบ่งกลุ่ม สาย A',
        venue: 'โรงยิม 2 มหาวิทยาลัยเชียงใหม่',
        matchDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.match.create({
      data: {
        homeTeamId: t[4].id, // Phuket Waves
        awayTeamId: t[6].id, // Chonburi Sharks
        homeScore: null,
        awayScore: null,
        status: 'upcoming',
        round: 'รอบแบ่งกลุ่ม สาย B',
        venue: 'ศูนย์กีฬาสะพานหิน ภูเก็ต',
        matchDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.match.create({
      data: {
        homeTeamId: t[5].id, // Khon Kaen Dinosaurs
        awayTeamId: t[7].id, // Nonthaburi Titans
        homeScore: null,
        awayScore: null,
        status: 'upcoming',
        round: 'รอบแบ่งกลุ่ม สาย B',
        venue: 'โรงยิมเนเซียม มหาวิทยาลัยขอนแก่น',
        matchDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      },
    });

    console.log('✅ Seeded sample matches');
  }

  // 4. News
  const newsCount = await prisma.news.count();
  if (newsCount === 0) {
    const newsData = [
      {
        title: 'เปิดฉากการแข่งขัน Thailand Basketball Championship 2025 อย่างยิ่งใหญ่!',
        category: 'ประกาศ',
        imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80',
        content: 'การแข่งขันบาสเกตบอลชิงแชมป์ประเทศไทยประจำปีนี้เปิดฉากขึ้นอย่างเป็นทางการ โดยมี 8 สโมสรชั้นนำร่วมชิงความเป็นหนึ่ง พร้อมเงินรางวัลรวมกว่า 1,000,000 บาท ทุกแมตช์เปิดให้แฟนกีฬาเข้าชมฟรี ณ สนามแข่งขันและรับชมการถ่ายทอดสดผ่านระบบออนไลน์',
      },
      {
        title: 'Bangkok Warriors เฉือนเอาชนะ Chiang Mai Highlands สุดมันส์ 88-82 ในเกมนัดเปิดสนาม',
        category: 'ผลการแข่งขัน',
        imageUrl: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=600&auto=format&fit=crop&q=80',
        content: 'แชมป์เก่า Bangkok Warriors โชว์ฟอร์มสมราคาเอาชนะ Chiang Mai Highlands ไปได้ในเกมสุดเดือด โดยผู้เล่นทำคะแนนสูงสุดของแมตช์กดไปถึง 32 คะแนน พร้อมลูกยิง 3 แต้มท้ายเกมที่เปลี่ยนกระแสเกมอย่างสิ้นเชิง',
      },
      {
        title: 'แนวทางและระเบียบการเข้าชมการแข่งขันสำหรับแฟนบาสเกตบอลทุกสนาม',
        category: 'ระเบียบการ',
        imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&auto=format&fit=crop&q=80',
        content: 'คณะกรรมการจัดการแข่งขันขอความร่วมมือผู้ชมทุกท่านปฏิบัติตามกฎกติกาการเข้าชม ห้ามนำขวดแก้วและวัตถุไวไฟเข้าสู่สนาม ประตูเปิดก่อนการแข่งขัน 1 ชั่วโมง 30 นาที กรุณาเตรียมบัตรประชาชนหรือหลักฐานแสดงตัวตนหน้าทางเข้า',
      },
      {
        title: 'Phuket Waves ประกาศความพร้อมสู้ศึกสาย B พร้อมดึงการ์ดจ่ายทีมชาติเสริมแกร่ง',
        category: 'ข่าวทีม',
        imageUrl: 'https://images.unsplash.com/photo-1505666287802-931dc83948e9?w=600&auto=format&fit=crop&q=80',
        content: 'ทีมภูเก็ต เวฟส์ เผยความมั่นใจเต็มร้อยหลังจากเก็บชัยชนะในนัดแรก พร้อมส่งสัญญาณเตือนคู่แข่งทุกทีมในสาย B ว่าพวกเขาพร้อมที่จะทะลุเข้าสู่รอบชิงชนะเลิศในฤดูกาลนี้',
      },
    ];

    for (const n of newsData) {
      await prisma.news.create({ data: n });
    }
    console.log(`✅ Seeded ${newsData.length} news articles`);
  }

  console.log('🎉 Seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
