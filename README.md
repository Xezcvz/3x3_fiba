# ระบบเว็บประกาศและจัดการการแข่งขันบาสเกตบอล 🏀
(Thailand Basketball Tournament Management System)

ระบบเว็บไซต์สำหรับประกาศและจัดการข้อมูลการแข่งขันบาสเกตบอล 3×3 ประกอบด้วยหน้าเว็บสาธารณะและระบบผู้ดูแล

---

## 🎨 ธีมและเทคโนโลยีที่ใช้

- **ธีมสี:** ขาว–ฟ้า (White & Blue) ตาม Tailwind custom palette (`primary-50` ถึง `primary-700` และ `base-white` / `gray-50`)
- **Frontend:** React + Tailwind CSS + Lucide Icons + Axios + React Router DOM (Vite)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL ผ่าน Prisma ORM (Render Free ใช้ฐานข้อมูลภายนอก เช่น Neon)
- **Authentication:** JWT ใน HttpOnly cookie พร้อม rate limit และรหัสผ่านแฮชด้วย bcryptjs

---

## 🚀 ลิงก์เข้าใช้งานระบบขณะนี้

- 🌐 **Frontend (หน้าเว็บหลัก):** [http://localhost:5173](http://localhost:5173)
- ⚙️ **Backend API Health Check:** [http://localhost:4000/api/health](http://localhost:4000/api/health)
- 🔐 **หน้าจัดการแอดมิน (Admin Login):** [http://localhost:5173/admin/login](http://localhost:5173/admin/login)

### เริ่มใช้งานแอดมิน
ไม่มีบัญชีหรือรหัสผ่านเริ่มต้นในระบบ ให้ตั้ง `ADMIN_USERNAME`, `ADMIN_PASSWORD` และ `JWT_SECRET` ใน `server/.env` แล้วสร้างบัญชีด้วย `npm run admin:create` จากโฟลเดอร์ `server` ดูขั้นตอนใน [USER_MANUAL.md](USER_MANUAL.md)

---

## 📋 หน้าเว็บและฟีเจอร์ของระบบ

### 1. ฝั่งผู้เข้าชมทั่วไป (Public UI)
1. **หน้าแรก (Home):**
   - แบนเนอร์ไฮไลต์ทัวร์นาเมนต์ดีไซน์ White & Blue โทนสีทันสมัย
   - แถบแสดงแมตช์ที่กำลังแข่งสด (LIVE) พร้อมไฟกระพริบ
   - ตารางแมตช์เร็วๆ นี้ และ ผลการแข่งขันล่าสุด
   - ตารางคะแนนสรุปย่อสาย A และ สาย B
   - การ์ดข่าวสารและประกาศสำคัญ
2. **ตารางแข่งขัน (Schedule):**
   - ตัวกรองสถานะ (เร็วๆ นี้, แข่งสด, ทั้งหมด, แข่งจบแล้ว)
   - ค้นหาตามชื่อทีม หรือ สนามแข่งขัน
   - กรองตามสายการแข่งขัน (สาย A, สาย B) หรือทีมเฉพาะ
3. **ผลการแข่งขัน & ตารางคะแนน (Results):**
   - ตารางคะแนน (Standings) ประจำสาย A และ สาย B (แข่ง, ชนะ, แพ้, ผลต่างแต้ม, คะแนนสะสม)
   - สรุปผลคะแนนทุกแมตช์ที่แข่งจบลง
4. **ทีมทั้งหมด (Teams):**
   - แสดงรายชื่อทีม ตราสัญลักษณ์ โค้ช จังหวัด และสถิติ
   - กรองแยกสาย A และ สาย B
5. **รายละเอียดทีม (Team Detail):**
   - ข้อมูลประวัติสโมสร ผู้ฝึกสอน ที่ตั้ง
   - ตารางแข่งและผลการแข่งขันย้อนหลังของทีมนั้นๆ
6. **รายละเอียดแมตช์ (Match Detail):**
   - แสดงคะแนนรวมและรายละเอียดแต้ม 1/2 คะแนนกับฟาวล์ตามรูปแบบ 3×3
   - ข้อมูลสนาม กติกาการแข่งขัน และสถานะ
7. **ข่าวสารและประกาศ (News):**
   - กรองตามหมวดหมู่ (ประกาศ, ผลการแข่งขัน, ข่าวทีม, ระเบียบการ)
   - หน้าต่าง Modal อ่านข่าวฉบับเต็ม

---

### 2. ฝั่งผู้ดูแลระบบ (Admin Management)
- **ระบบ Login & JWT Auth:** ป้องกันการเข้าถึงหน้าจัดการ
- **Admin Dashboard:** แสดงภาพรวมสถิติทัวร์นาเมนต์ (จำนวนทีม, แมตช์สด, แมตช์ทั้งหมด, ข่าวสาร) พร้อมคีย์ลัด
- **จัดการแมตช์ (Manage Matches):**
  - เพิ่มตารางแข่งใหม่ กำหนดวัน เวลา สนาม และสาย
  - อัปเดตสถานะแบบเรียลไทม์ (`upcoming`, `live`, `finished`)
  - กรอกคะแนนรวมและรายละเอียดการยิง 1/2 คะแนน พร้อมตรวจสอบเงื่อนไขการจบเกม
  - ลบแมตช์
- **จัดการทีม (Manage Teams):**
  - เพิ่ม แก้ไข ลบทีม กำหนดสาย (A/B), ชื่อโค้ช, รูปโลโก้, และประวัติสโมสร
- **จัดการข่าว (Manage News):**
  - เขียนข่าวใหม่ ใส่ภาพประกอบ เลือกหมวดหมู่ แก้ไข และลบข่าวสาร

---

## 🛠 คำสั่งในการรันระบบ (สำหรับใช้งานในอนาคต)

### 1. รัน Backend
```bash
cd server
npm run dev
# เซิร์ฟเวอร์จะเปิดที่ http://localhost:4000
```

### 2. รัน Frontend
```bash
cd client
npm run dev
# เข้าชมเว็บไซต์ที่ http://localhost:5173
```

### 3. เตรียมฐานข้อมูลและข้อมูลตัวอย่าง
```bash
cd server
npm run prisma:migrate:deploy
npm run seed
```
คำสั่งนี้ใช้กับ PostgreSQL ที่ระบุใน `DATABASE_URL` / `DIRECT_URL`; seed จะเพิ่มข้อมูลตัวอย่างเฉพาะเมื่อฐานข้อมูลยังว่าง

### 4. สร้างบัญชีผู้ดูแล
คัดลอก `.env.example` เป็น `.env` และตั้งค่าความลับก่อน จากนั้น:
```bash
cd server
npm run admin:create
```

### Deploy บน Render Free พร้อมฐานข้อมูลถาวร

ทำตามหัวข้อ Deploy ใน [คู่มือ USER_MANUAL.md](USER_MANUAL.md) ซึ่งมีขั้นตอนสร้าง Neon, ตั้ง `.env`, ย้ายข้อมูล SQLite, ทดสอบในเครื่อง และตั้งค่า Render Dashboard

ลำดับสำคัญ: สร้าง PostgreSQL ก่อน → รัน migration และ import SQLite จากเครื่องก่อน deploy แรก → push โค้ดไป GitHub → Render Dashboard เลือก **New → Blueprint** แล้วเชื่อม repo ที่มี `render.yaml`. ถ้ามี Render service เดิมอยู่แล้ว ให้เพิ่ม environment variables ใน service นั้นและ sync Blueprint แทนการสร้าง service ซ้ำ

Environment Variables ที่ต้องตั้งใน Render: `DATABASE_URL` (pooled), `DIRECT_URL` (direct), `ADMIN_USERNAME` และ `ADMIN_PASSWORD`. อย่าใส่ secrets ใน Git.

ถ้าต้องการย้าย SQLite เดิม ให้ชี้ `server/.env` ไปยัง PostgreSQL ว่างนั้น แล้วรันก่อน deploy:

```powershell
npm --prefix server run prisma:migrate:deploy
npm --prefix server run db:import-sqlite
```

Importer อ่าน `server/prisma/dev.db` (หรือ `SQLITE_PATH` ที่กำหนด), เก็บ IDs/ผลแข่ง/บัญชี admin และหยุดโดยไม่เขียนอะไรถ้าฐานข้อมูลปลายทางไม่ว่าง ต้องใช้ Node.js 22.13 ขึ้นไป

เมื่อ build ผ่าน `render.yaml` จะ apply migrations, seed เฉพาะเมื่อฐานข้อมูลยังไม่มีทีม/แมตช์ และสร้าง/อัปเดตบัญชี admin จาก Environment Variables.

Render Free อาจพักตัวเว็บเมื่อไม่มีคนเข้า 15 นาที และฐานข้อมูลฟรีก็อาจ scale-to-zero หรือมีโควตา compute/storage/network ของผู้ให้บริการ เมื่อใช้โควตาหมดการเชื่อมต่ออาจหยุดชั่วคราว แต่ PostgreSQL ภายนอกแยกจาก filesystem ของ Render จึงไม่ถูกลบเมื่อเว็บ restart หรือ deploy ใหม่ ดูโควตาปัจจุบันและสำรองข้อมูลใน dashboard ของผู้ให้บริการฐานข้อมูล.
