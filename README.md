# Smart Helpdesk with AI

> **สถานะโปรเจกต์:** อยู่ระหว่างการพัฒนา (Work in Progress / In Development)

## สถานะโปรเจกต์

Smart Helpdesk with AI ยังอยู่ระหว่างการพัฒนา ฟีเจอร์หลักสำหรับสาธิตกระบวนการรับแจ้งและติดตามปัญหา IT สามารถใช้งานได้แล้ว แต่ระบบยังไม่ได้เตรียมพร้อมสำหรับการใช้งานในระดับ Production

## เกี่ยวกับโปรเจกต์

Smart Helpdesk with AI เป็นเว็บแอปพลิเคชันแบบ Full Stack สำหรับจัดการงาน IT Support ภายในองค์กรหรือสถานศึกษา ผู้ใช้สามารถแจ้งปัญหาผ่านหน้าแชท โดย Google Gemini จะช่วยวิเคราะห์หมวดหมู่ ระดับความเร่งด่วน และแนะนำวิธีแก้ไขเบื้องต้น

หาก AI ไม่มั่นใจในคำตอบ หรือผู้ใช้ยืนยันว่าคำแนะนำยังแก้ปัญหาไม่ได้ ระบบจะสร้าง Ticket เพื่อส่งต่อให้เจ้าหน้าที่ ผู้ดูแลระบบสามารถมอบหมาย Ticket ให้เจ้าหน้าที่ที่เหมาะสม และผู้ใช้สามารถติดตามสถานะ สนทนากับเจ้าหน้าที่ และประเมินผลหลังปิดงานได้

ระบบใช้รูปแบบบัญชีที่จัดการโดยผู้ดูแลระบบ (Admin-managed accounts) ไม่มีการสมัครสมาชิกแบบสาธารณะ ผู้ดูแลระบบเป็นผู้สร้างบัญชี USER และ STAFF พร้อมรหัสผ่านชั่วคราว และระบบจะบังคับให้เจ้าของบัญชีเปลี่ยนรหัสผ่านก่อนใช้งานส่วนอื่น

## ฟีเจอร์ที่ใช้งานได้ในปัจจุบัน

### ผู้ใช้งานทั่วไป (USER)

- เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน
- เปลี่ยนรหัสผ่านชั่วคราวเมื่อเข้าสู่ระบบครั้งแรก
- สนทนากับ AI เพื่อแจ้งปัญหาและรับคำแนะนำเบื้องต้น
- รับผลวิเคราะห์หมวดหมู่ `NETWORK`, `HARDWARE`, `SOFTWARE` หรือ `ACCOUNT`
- รับผลวิเคราะห์ระดับความเร่งด่วน `LOW`, `MEDIUM` หรือ `HIGH`
- สร้าง Ticket อัตโนมัติเมื่อ AI ไม่มั่นใจ หรือส่งเรื่องต่อด้วยตนเองเมื่อคำแนะนำแก้ปัญหาไม่ได้
- ดูรายการ รายละเอียด สถานะ และประวัติข้อความของ Ticket ของตนเอง
- ส่งข้อความโต้ตอบกับเจ้าหน้าที่ใน Ticket ที่ยังไม่ปิด
- ยืนยันผลการแก้ไขและให้คะแนน 1–5 ดาว พร้อมความคิดเห็น
- ส่ง Ticket กลับไปยังสถานะกำลังดำเนินการ หากปัญหายังไม่ได้รับการแก้ไข

### เจ้าหน้าที่ (STAFF)

- ดู Ticket ที่ได้รับมอบหมาย
- อ่านรายละเอียดปัญหาและประวัติการสนทนาที่เกี่ยวข้อง
- สนทนากับผู้แจ้งปัญหา
- อัปเดตสถานะ Ticket และบันทึกวิธีแก้ไข
- ระบุความเชี่ยวชาญตามหมวดหมู่เพื่อช่วยในการมอบหมายงาน

### ผู้ดูแลระบบ (ADMIN)

- ดู Dashboard ภาพรวมของ Ticket
- สร้างบัญชี USER และ STAFF
- กำหนดความเชี่ยวชาญให้เจ้าหน้าที่
- เปิดหรือระงับบัญชี และรีเซ็ตรหัสผ่านผู้ใช้
- มอบหมาย Ticket ให้เจ้าหน้าที่
- เพิ่ม แก้ไข และลบข้อมูล FAQ
- ดูรายงานตามช่วงเวลาและหมวดหมู่
- ดูจำนวน Ticket แยกตามสถานะ หมวดหมู่ ประสิทธิภาพเจ้าหน้าที่ และคะแนนความพึงพอใจเฉลี่ย

## การทำงานของ AI และ Ticket

1. USER ส่งรายละเอียดปัญหาผ่านหน้าแชท
2. Gemini วิเคราะห์หมวดหมู่ ความเร่งด่วน ความมั่นใจ และสร้างคำแนะนำเบื้องต้น
3. หาก AI มั่นใจ USER สามารถยืนยันว่าแก้ไขสำเร็จ หรือเลือกส่งต่อให้เจ้าหน้าที่
4. หาก AI ไม่มั่นใจ ระบบจะสร้าง Ticket สถานะ `OPEN` โดยอัตโนมัติ
5. ADMIN มอบหมาย Ticket ให้ STAFF และสถานะเปลี่ยนเป็น `ASSIGNED`
6. STAFF ดำเนินการ ตอบกลับ และเปลี่ยนสถานะเป็น `IN_PROGRESS` หรือ `RESOLVED`
7. USER ยืนยันผลและประเมินบริการเพื่อปิด Ticket เป็น `CLOSED` หรือส่งกลับไปยัง `IN_PROGRESS`

ลำดับสถานะหลักของ Ticket คือ:

```text
OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
```

## ฟีเจอร์ที่ยังไม่มีหรืออยู่ระหว่างพัฒนา

- การสมัครสมาชิกแบบสาธารณะ (ปัจจุบันปิดไว้ตามรูปแบบ Admin-managed accounts)
- การแนบไฟล์หรือรูปภาพในแชทและ Ticket
- การแจ้งเตือนผ่านอีเมล LINE หรือ Push Notification
- การอัปเดตข้อความแบบ WebSocket/SSE โดยปัจจุบันหน้าแชทตรวจข้อความใหม่เป็นช่วงเวลา
- Single Sign-On (SSO) แม้โครงสร้างข้อมูลจะเตรียมรองรับ metadata บางส่วนไว้แล้ว
- การตั้งค่า Deployment, Monitoring, Backup และ Production hardening แบบครบวงจร

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Auth.js / NextAuth v5 แบบ Credentials และ JWT session
- Prisma ORM 6
- PostgreSQL
- Google Gemini (`gemini-2.5-flash`)
- bcryptjs สำหรับเข้ารหัสรหัสผ่าน

## โครงสร้างโปรเจกต์

```text
app/                 Pages, layouts และ Route Handlers ของ Next.js
  admin/             Dashboard, ผู้ใช้, Ticket, FAQ และรายงานสำหรับ ADMIN
  api/               API สำหรับ Authentication, AI chat และ Ticket workflow
  chat/              หน้าแจ้งปัญหาและสนทนากับ AI
  staff/             หน้าจัดการ Ticket สำหรับ STAFF
  tickets/           รายการและรายละเอียด Ticket สำหรับ USER
components/          UI components ที่ใช้ร่วมกัน
hooks/               Client hooks เช่น การโหลดและส่งข้อความในแชท
lib/                 Prisma client, Gemini integration, validation และค่าคงที่
prisma/
  schema.prisma      โครงสร้างฐานข้อมูล
  seed.ts            ข้อมูลตัวอย่างสำหรับการสาธิต
public/              Static assets
tests/               Automated tests สำหรับ validation logic
auth.ts              การตั้งค่า Auth.js และ Credentials authentication
proxy.ts             การป้องกันเส้นทางและควบคุมสิทธิ์ตามบทบาท
```

รายละเอียดเพิ่มเติมเกี่ยวกับ data model, routes และ process อยู่ใน [Project Summary](./smart-helpdesk-project-summary.md)

## การติดตั้ง

สิ่งที่ต้องมี:

- Node.js 20.9.0 ขึ้นไป
- npm
- PostgreSQL database
- Google Gemini API key สำหรับใช้งาน AI (หากไม่กำหนด ระบบจะตอบด้วย fallback response และสร้าง Ticket)

1. Clone repository และเข้าไปยังไดเรกทอรีของโปรเจกต์

2. ติดตั้ง dependencies

   ```bash
   npm install
   ```

3. คัดลอก `.env.example` เป็น `.env`

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   macOS/Linux:

   ```bash
   cp .env.example .env
   ```

4. แทนที่ safe placeholders ใน `.env` ด้วยค่าที่ใช้ในเครื่อง

5. สร้าง Prisma Client และอัปเดตโครงสร้างฐานข้อมูล

   ```bash
   npx prisma generate
   npx prisma db push
   ```

6. หากต้องการข้อมูลตัวอย่าง ให้รัน seed ตามหัวข้อ [ข้อมูลตัวอย่าง](#ข้อมูลตัวอย่าง)

7. เปิด development server

   ```bash
   npm run dev
   ```

8. เปิด [http://localhost:3000](http://localhost:3000)

## Environment Variables

โปรเจกต์รองรับ Environment Variables ต่อไปนี้:

| Variable | หน้าที่ |
| --- | --- |
| `DATABASE_URL` | Connection string หลักสำหรับ PostgreSQL |
| `DIRECT_URL` | Direct connection string ที่ Prisma ใช้เชื่อมต่อฐานข้อมูลโดยตรง |
| `AUTH_SECRET` | Secret สำหรับลงนามข้อมูล Authentication ควรเป็นค่าสุ่มที่มีความยาวและคาดเดาได้ยาก |
| `GEMINI_API_KEY` | API key สำหรับเรียก Google Gemini |
| `AI_USE_FAQ` | `true` ให้ AI อ้างอิง FAQ ในฐานข้อมูล หรือ `false` ให้ตอบจากความรู้ของโมเดลโดยตรง |
| `ALLOW_DESTRUCTIVE_SEED` | ต้องเป็น `true` ชั่วคราวเมื่อยืนยันว่าจะรัน demo seed ที่ล้างข้อมูลเดิม |

ห้าม commit `.env`, database credentials, API keys, tokens หรือ secrets จริงลง Git

## โหมดการตอบของ AI

ค่าเริ่มต้นใน `.env.example` คือ:

```env
AI_USE_FAQ="false"
```

ในโหมดนี้ Gemini จะตอบโดยใช้ความรู้ทั่วไปของโมเดลและแนวปฏิบัติด้าน IT Support หากต้องการให้ระบบส่งข้อมูล FAQ ที่เกี่ยวข้องจากฐานข้อมูลไปประกอบการวิเคราะห์ ให้กำหนดค่าเป็น:

```env
AI_USE_FAQ="true"
```

จากนั้น restart development server การเปลี่ยนค่านี้ไม่ได้ปิดการส่งข้อความของผู้ใช้ไปยัง Gemini

หากไม่ได้กำหนด `GEMINI_API_KEY`, เรียก Gemini ไม่สำเร็จ หรือผลลัพธ์ไม่อยู่ในรูปแบบที่ระบบรองรับ ระบบจะใช้ fallback response และสร้าง Ticket เพื่อส่งต่อให้เจ้าหน้าที่

## ข้อมูลตัวอย่าง

ไฟล์ `prisma/seed.ts` มีบัญชี FAQ Ticket ข้อความ และผลประเมินตัวอย่างสำหรับการสาธิต

> **คำเตือน:** Demo seed จะลบข้อมูลเดิมในตารางที่เกี่ยวข้องทั้งหมดก่อนสร้างข้อมูลตัวอย่างใหม่ ห้ามรันกับฐานข้อมูลที่มีข้อมูลจริง

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

บัญชีสาธิตที่ seed สร้างขึ้น:

| บทบาท | อีเมล | รหัสผ่าน |
| --- | --- | --- |
| ADMIN | `admin@helpdesk.com` | `20042004` |
| STAFF | `staff.network@helpdesk.com` | `20042004` |
| STAFF | `staff.software@helpdesk.com` | `20042004` |
| USER | `user@helpdesk.com` | `20042004` |

บัญชีและรหัสผ่านเหล่านี้ใช้สำหรับ Local demo เท่านั้น ห้ามใช้กับระบบจริง

## การตรวจสอบโปรเจกต์

ปัจจุบันโปรเจกต์มี Automated tests จำนวน 4 tests ครอบคลุมนโยบายรหัสผ่านและการตรวจสอบคะแนนประเมิน สามารถตรวจสอบโปรเจกต์ได้ด้วยคำสั่ง:

```bash
npm test
npm run lint
npm run build
npx prisma validate
```

Automated tests ปัจจุบันยังไม่ครอบคลุม Authentication, Authorization, API routes, Database integration, Gemini integration และพฤติกรรมของ UI ในระดับ browser

คำสั่ง `npm run build` และ `npx prisma validate` ต้องเข้าถึง Environment Variables ที่จำเป็น โดยขั้นตอน build บางส่วนอาจต้องเชื่อมต่อฐานข้อมูลตามลักษณะของหน้าในโปรเจกต์

## คำสั่งที่ใช้บ่อย

```bash
npm run dev        # เปิด development server
npm test           # รัน Automated tests
npm run lint       # ตรวจโค้ดด้วย ESLint
npm run build      # สร้าง production build
npm run start      # เปิด production server จาก build ที่สร้างแล้ว
npx prisma validate # ตรวจสอบ Prisma schema
npx prisma studio  # เปิดหน้าจัดการข้อมูลของ Prisma
```

## ข้อจำกัดปัจจุบัน

- ระบบออกแบบเป็น Mini Project และยังไม่ได้ผ่านการทดสอบสำหรับปริมาณผู้ใช้ระดับ Production
- หน้าแชทใช้ polling ทุก 4 วินาที ไม่ใช่การสื่อสารแบบ real-time เต็มรูปแบบ
- การจำแนกหมวดหมู่ ความเร่งด่วน และคำแนะนำขึ้นอยู่กับผลลัพธ์จากโมเดล AI ซึ่งอาจคลาดเคลื่อนได้
- Automated tests ปัจจุบันครอบคลุมเฉพาะ validation logic บางส่วนเท่านั้น
- ระบบยังไม่มี file storage, notification service, audit log, rate limiting และ background job queue
- การ deploy จริงต้องจัดเตรียม HTTPS, managed database, secret management, logging, monitoring และ backup เพิ่มเติม

## Security / Privacy

- รหัสผ่านจัดเก็บด้วย bcrypt และไม่เก็บเป็น plain text
- รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวอักษรกับตัวเลข
- Session ใช้ JWT ผ่าน Auth.js
- หน้าและ API ที่สำคัญตรวจสอบการเข้าสู่ระบบ ความเป็นเจ้าของข้อมูล และบทบาทของผู้ใช้
- บัญชีที่ถูกระงับจะไม่สามารถเข้าสู่ระบบได้ และสถานะบัญชีจะถูกตรวจซ้ำสำหรับ session ที่มีอยู่
- บัญชีที่ใช้รหัสผ่านชั่วคราวต้องเปลี่ยนรหัสผ่านก่อนเข้าถึงส่วนอื่นของระบบ
- จำกัดข้อความแชทสูงสุด 4,000 ตัวอักษร
- `.env`, dependencies, build output และไฟล์ log ของ package manager ถูกแยกออกจาก version control
- ข้อความปัญหาที่ผู้ใช้ส่งผ่านหน้าแชทจะถูกส่งไปยัง Google Gemini เพื่อประมวลผล จึงไม่ควรกรอกรหัสผ่าน OTP, API key, ข้อมูลลับ หรือข้อมูลส่วนบุคคลที่ไม่จำเป็น
- ก่อนใช้งานจริงควรเพิ่ม rate limiting, security headers, audit logging, retention policy และกระบวนการจัดการข้อมูลส่วนบุคคลที่เหมาะสม

## ผู้พัฒนา / ความรับผิดชอบ

ผู้พัฒนา: **MatchaWannoi**

Smart Helpdesk with AI เป็น Mini Project ที่ครอบคลุมงานหลักดังต่อไปนี้:

- วิเคราะห์ความต้องการและออกแบบ Workflow ของระบบ Helpdesk
- ออกแบบฐานข้อมูลและ Ticket lifecycle
- พัฒนา Authentication และ Role-based authorization
- พัฒนา AI chat และการเชื่อมต่อ Google Gemini
- พัฒนา Workflow สำหรับ USER, STAFF และ ADMIN
- พัฒนาระบบจัดการผู้ใช้ FAQ Ticket การประเมินผล และรายงาน
- ออกแบบและพัฒนา UI
- จัดทำ Documentation

## หมายเหตุ

โปรเจกต์นี้จัดทำเพื่อการศึกษาและใช้เป็น Portfolio ไม่ใช่ Production Application และยังไม่ได้ระบุช่องทาง Deploy สำหรับใช้งานออนไลน์
