# สเปคระบบเว็บประกาศการแข่งขันบาสเกตบอล

## 1. ภาพรวมโปรเจกต์

เว็บไซต์สำหรับประกาศ/จัดการข้อมูลการแข่งขันบาสเกตบอล เช่น ตารางแข่ง ผลการแข่งขัน ทีม และข่าวสาร
- **Frontend:** React + Tailwind CSS
- **Backend:** Node.js (Express)
- **Database:** PostgreSQL ผ่าน Prisma ORM สำหรับ deploy; ใช้ฐานข้อมูล PostgreSQL ที่แยกจาก Render filesystem เพื่อให้ข้อมูลคงอยู่หลัง restart/deploy
- **ธีมสี:** ขาว–ฟ้า (White & Blue)

---

## 2. ธีมและ UX/UI

### 2.1 โทนสี (Tailwind custom palette)
```js
colors: {
  primary: {
    50:  '#eff6ff',
    100: '#dbeafe',
    400: '#60a5fa',
    500: '#3b82f6', // สีฟ้าหลัก (ปุ่ม, ลิงก์, ไฮไลต์)
    600: '#2563eb',
    700: '#1d4ed8',
  },
  base: {
    white: '#ffffff',
    gray50: '#f8fafc',
    gray100: '#f1f5f9',
    gray700: '#334155',
  }
}
```

### 2.2 แนวทาง UI
- พื้นหลังหลัก: ขาว / gray-50
- Navbar: พื้นขาว เงาบาง ตัวอักษร/โลโก้สีฟ้าเข้ม (primary-700)
- การ์ดแมตช์แข่ง: ขอบมน (rounded-xl), เงาเบา (shadow-sm → shadow-md ตอน hover)
- ปุ่มหลัก (CTA): พื้นฟ้า (primary-500) ตัวหนังสือขาว, hover เป็น primary-600
- สถานะแมตช์: ใช้ badge สี
  - 🔵 กำลังจะแข่ง = primary-100/primary-700
  - 🟢 กำลังแข่งสด (LIVE) = เขียว + dot กระพริบ
  - ⚪ จบแล้ว = gray-100/gray-600
- ฟอนต์: Inter หรือ Noto Sans Thai (รองรับภาษาไทย)
- Responsive: Mobile-first, breakpoint `sm/md/lg` ของ Tailwind
- Dark mode: ไม่บังคับ (phase 2 ถ้าต้องการ)

### 2.3 หน้าเว็บหลัก (Pages)
1. **หน้าแรก (Home)** – แบนเนอร์ทัวร์นาเมนต์, แมตช์เร็วๆ นี้, ผลล่าสุด, ข่าวประกาศ
2. **ตารางแข่งขัน (Schedule)** – filter ตามวันที่/สาย/ทีม
3. **ผลการแข่งขัน (Results)** – คะแนน, สรุปผล, box score เบื้องต้น
4. **ทีมทั้งหมด (Teams)** – รายชื่อทีม โลโก้ ผู้เล่น
5. **รายละเอียดทีม (Team Detail)**
6. **รายละเอียดแมตช์ (Match Detail)** – คะแนนตามควอเตอร์, สถิติ
7. **ข่าว/ประกาศ (News/Announcements)**
8. **หน้า Admin (ป้องกันด้วย login)** – เพิ่ม/แก้ไข ทีม, ตาราง, ผล, ข่าว

---

## 3. โครงสร้างโปรเจกต์

```
basketball-tournament/
├── client/                     # React + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── MatchCard.jsx
│   │   │   ├── TeamCard.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── NewsCard.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Schedule.jsx
│   │   │   ├── Results.jsx
│   │   │   ├── Teams.jsx
│   │   │   ├── TeamDetail.jsx
│   │   │   ├── MatchDetail.jsx
│   │   │   ├── News.jsx
│   │   │   └── admin/
│   │   │       ├── AdminLogin.jsx
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── ManageMatches.jsx
│   │   │       ├── ManageTeams.jsx
│   │   │       └── ManageNews.jsx
│   │   ├── services/
│   │   │   └── api.js          # axios wrapper เรียก backend
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css           # Tailwind directives
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                     # Node.js + Express
│   ├── src/
│   │   ├── routes/
│   │   │   ├── matches.routes.js
│   │   │   ├── teams.routes.js
│   │   │   ├── news.routes.js
│   │   │   └── auth.routes.js
│   │   ├── controllers/
│   │   │   ├── matches.controller.js
│   │   │   ├── teams.controller.js
│   │   │   ├── news.controller.js
│   │   │   └── auth.controller.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js      # ตรวจ JWT สำหรับ admin
│   │   │   └── error.middleware.js
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── utils/
│   │   │   └── jwt.js
│   │   └── app.js
│   ├── prisma/
│   │   └── migrations/
│   ├── .env
│   └── package.json
│
└── README.md
```

---

## 4. โครงสร้างฐานข้อมูล (Prisma schema แบบย่อ)

```prisma
model Team {
  id        Int       @id @default(autoincrement())
  name      String
  logoUrl   String?
  group     String?   // สาย A, B, ...
  createdAt DateTime  @default(now())
  homeMatches Match[]  @relation("HomeTeam")
  awayMatches Match[]  @relation("AwayTeam")
}

model Match {
  id          Int       @id @default(autoincrement())
  homeTeam    Team      @relation("HomeTeam", fields: [homeTeamId], references: [id])
  homeTeamId  Int
  awayTeam    Team      @relation("AwayTeam", fields: [awayTeamId], references: [id])
  awayTeamId  Int
  homeScore   Int?
  awayScore   Int?
  matchDate   DateTime
  venue       String?
  status      String    @default("upcoming") // upcoming | live | finished
  round       String?   // รอบแบ่งกลุ่ม, รอบรองฯ, ชิงชนะเลิศ
}

model News {
  id        Int      @id @default(autoincrement())
  title     String
  content   String
  imageUrl  String?
  createdAt DateTime @default(now())
}

model Admin {
  id       Int    @id @default(autoincrement())
  username String @unique
  password String // hash ด้วย bcrypt
}
```

---

## 5. REST API Endpoints

| Method | Endpoint              | คำอธิบาย                      | Auth |
|--------|------------------------|-------------------------------|------|
| GET    | /api/teams             | รายชื่อทีมทั้งหมด             | ไม่ต้อง |
| GET    | /api/teams/:id         | รายละเอียดทีม                 | ไม่ต้อง |
| POST   | /api/teams             | เพิ่มทีม                      | ✅ |
| PUT    | /api/teams/:id         | แก้ไขทีม                      | ✅ |
| DELETE | /api/teams/:id         | ลบทีม                         | ✅ |
| GET    | /api/matches           | ตารางแข่ง (filter ?status=) | ไม่ต้อง |
| GET    | /api/matches/:id       | รายละเอียดแมตช์               | ไม่ต้อง |
| POST   | /api/matches           | เพิ่มแมตช์                    | ✅ |
| PUT    | /api/matches/:id       | แก้ไข/อัปเดตคะแนน             | ✅ |
| DELETE | /api/matches/:id       | ลบแมตช์                       | ✅ |
| GET    | /api/news               | รายการข่าว                    | ไม่ต้อง |
| POST   | /api/news               | เพิ่มข่าว                     | ✅ |
| POST   | /api/auth/login         | เข้าสู่ระบบ admin (คืน JWT)   | ไม่ต้อง |

---

## 6. ขั้นตอนติดตั้งและรัน

### Backend
```bash
cd server
npm install express cors dotenv bcrypt jsonwebtoken @prisma/client
npm install -D prisma nodemon
npx prisma init --datasource-provider postgresql
npx prisma migrate dev --name init
npm run dev
```

### Frontend
```bash
cd client
npm create vite@latest . -- --template react
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install axios react-router-dom
npm run dev
```

ตั้งค่า `.env` ฝั่ง server:
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require&schema=public"
JWT_SECRET="your-secret-key"
PORT=4000
```

---

## 7. แผนพัฒนา (Roadmap แนะนำ)

1. **Phase 1 — Core:** ตั้งค่าโปรเจกต์, DB schema, API พื้นฐาน (teams, matches)
2. **Phase 2 — Public UI:** หน้า Home, Schedule, Results, Teams พร้อมธีมขาว-ฟ้า
3. **Phase 3 — Admin:** ระบบ login + CRUD จัดการทีม/แมตช์/ข่าว
4. **Phase 4 — Polish:** Loading state, empty state, responsive ปรับละเอียด, SEO meta tags
5. **Phase 5 (ถ้าต้องการ):** Realtime คะแนนสดด้วย WebSocket (Socket.io)

---

## 8. หมายเหตุเรื่องความง่ายในการใช้งาน
- ใช้ PostgreSQL เพื่อให้ production เก็บข้อมูลถาวรบน Render Free ได้ผ่านฐานข้อมูลภายนอก และใช้ Prisma สำหรับ migrations
- ฝั่ง frontend ใช้ Vite เพื่อ dev server เร็ว ไม่ซับซ้อนเหมือน CRA
- Auth ใช้ JWT แบบง่าย เก็บ token ใน localStorage พอสำหรับ admin คนเดียว/ทีมเล็ก
