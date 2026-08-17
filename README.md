# Smart Helpdesk with AI

Mini project ระบบแจ้งปัญหา IT และติดตามคำร้อง โดยมี AI ช่วยวิเคราะห์หมวดหมู่ ความเร่งด่วน และแนะนำวิธีแก้ไขเบื้องต้น หาก AI ไม่มั่นใจ ระบบจะสร้าง Ticket เพื่อส่งต่อให้เจ้าหน้าที่

## ความสามารถหลัก

- ผู้ใช้ (USER): แชทกับ AI, ดูและติดตาม Ticket, ตอบเจ้าหน้าที่ และประเมินผลหลังแก้ไข
- เจ้าหน้าที่ (STAFF): ดูงานที่ได้รับมอบหมาย, ตอบผู้ใช้, อัปเดตสถานะ และบันทึกวิธีแก้ไข
- ผู้ดูแลระบบ (ADMIN): จัดการผู้ใช้และ FAQ, มอบหมาย Ticket และดูรายงานภาพรวม
- AI: วิเคราะห์หมวดหมู่ NETWORK, HARDWARE, SOFTWARE หรือ ACCOUNT พร้อมระดับความเร่งด่วน

## เทคโนโลยี

- Next.js 16 และ React 19
- TypeScript และ Tailwind CSS 4
- Auth.js / NextAuth แบบ Credentials
- Prisma ORM และ PostgreSQL
- Google Gemini

## การติดตั้ง

ต้องมี Node.js 20 ขึ้นไป, npm และฐานข้อมูล PostgreSQL

1. ติดตั้ง dependencies

   ```bash
   npm install
   ```

2. คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่าจริง

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   macOS/Linux:

   ```bash
   cp .env.example .env
   ```

3. สร้าง Prisma Client และตารางฐานข้อมูล

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. สร้างข้อมูลตัวอย่าง (คำสั่งนี้ล้างข้อมูลเดิมทั้งหมด)

   PowerShell:

   ```powershell
   $env:ALLOW_DESTRUCTIVE_SEED="true"
   npx prisma db seed
   Remove-Item Env:ALLOW_DESTRUCTIVE_SEED
   ```

   macOS/Linux:

   ```bash
   ALLOW_DESTRUCTIVE_SEED=true npx prisma db seed
   ```

5. เปิด development server

   ```bash
   npm run dev
   ```

เปิด [http://localhost:3000](http://localhost:3000)

## บัญชีทดลอง

ข้อมูลเหล่านี้ถูกสร้างโดย `prisma/seed.ts` และใช้สำหรับการสาธิตเท่านั้น

| บทบาท | อีเมล | รหัสผ่าน |
| --- | --- | --- |
| Admin | `admin@helpdesk.com` | `20042004` |
| Staff | `staff.network@helpdesk.com` | `20042004` |
| Staff | `staff.software@helpdesk.com` | `20042004` |
| User | `user@helpdesk.com` | `20042004` |

ห้ามใช้บัญชีหรือรหัสผ่านทดลองกับระบบจริง

## โหมดการตอบของ AI

ค่าเริ่มต้น `AI_USE_FAQ=false` จะให้ Gemini ตอบจากความรู้ของโมเดลโดยตรง หากต้องการให้คำตอบอ้างอิงข้อมูลในตาราง FAQ ให้ตั้งค่า:

```env
AI_USE_FAQ=true
```

จากนั้น restart development server

## คำสั่งที่ใช้บ่อย

```bash
npm run dev       # เปิดระบบสำหรับพัฒนา
npm run lint      # ตรวจโค้ดด้วย ESLint
npm run build     # ตรวจและ build สำหรับ production
npm run start     # เปิด production build
npx prisma studio # เปิดหน้าจัดการข้อมูลของ Prisma
```

## หมายเหตุด้านความปลอดภัย

- `.env` และ secret ต่าง ๆ ถูก Git ignore ห้ามนำค่าจริงขึ้น repository
- เนื้อหาที่ผู้ใช้ส่งในหน้าแชทจะถูกส่งไปยัง Google Gemini เพื่อประมวลผล
- Demo seed จะไม่ทำงานจนกว่าจะตั้ง `ALLOW_DESTRUCTIVE_SEED=true` เพราะสคริปต์จะล้างข้อมูลเดิมก่อนสร้างข้อมูลตัวอย่าง
