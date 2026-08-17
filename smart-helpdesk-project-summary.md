# Smart Helpdesk with AI — Project Summary

อัปเดตล่าสุด: 2 สิงหาคม 2026

## 1. ภาพรวม

Smart Helpdesk เป็นเว็บแอป full-stack สำหรับงาน IT Support ภายในบริษัทหรือสถานศึกษา ผู้ใช้แจ้งปัญหาผ่านแชท จากนั้น Gemini จะวิเคราะห์หมวดหมู่ ความเร่งด่วน และสร้างคำแนะนำเบื้องต้น ปัจจุบันระบบตั้งให้ Gemini ตอบจากความรู้ทั่วไปของโมเดลเป็นค่าเริ่มต้น โดยสามารถเปิดโหมดอ้างอิง FAQ ได้ผ่าน Environment Variable หาก AI ไม่มั่นใจหรือผู้ใช้ยืนยันว่าคำตอบยังแก้ปัญหาไม่ได้ ระบบจะสร้าง Ticket เพื่อส่งต่อเจ้าหน้าที่

ระบบใช้รูปแบบ **Admin-managed accounts**: ไม่มีการสมัครสมาชิกสาธารณะ Admin เป็นผู้สร้างบัญชี USER/STAFF และระบบออกรหัสผ่านชั่วคราวให้ ผู้ใช้ต้องเปลี่ยนรหัสผ่านก่อนเข้าใช้งานส่วนอื่น

## 2. Technology Stack

| ส่วน | เทคโนโลยี |
|---|---|
| Framework | Next.js 16.2.10 App Router |
| UI | React 19.2.4, Tailwind CSS 4 |
| Language | TypeScript |
| Authentication | Auth.js/NextAuth v5 Credentials + JWT session |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 6.19.3 |
| AI | Google Gemini `gemini-2.5-flash` |
| Password hashing | bcryptjs |

โปรเจกต์ใช้ `proxy.ts` ตาม convention ของ Next.js 16 และใช้ path alias `@/*` ชี้ไปที่ root

## 3. บทบาทผู้ใช้

| Role | หน้าที่ |
|---|---|
| USER | แจ้งปัญหา สนทนากับ AI ติดตาม Ticket และตอบเจ้าหน้าที่ |
| STAFF | ดู Ticket ที่ได้รับมอบหมาย ตอบผู้ใช้ อัปเดตสถานะ และบันทึกวิธีแก้ |
| ADMIN | ดู Ticket ทั้งหมด มอบหมาย Staff และจัดการบัญชี USER/STAFF |

บัญชี `ai-system-bot` เป็นบัญชีระบบภายใน ไม่แสดงในหน้าจัดการบัญชีและห้ามแก้ไขผ่าน API

## 4. Account Provisioning และ Authentication

### การสร้างบัญชี

1. สร้าง Admin เริ่มต้นผ่าน `prisma/seed.ts`
2. Admin เข้า `/admin/users`
3. Admin ระบุชื่อ อีเมลองค์กร และ role USER หรือ STAFF
4. ถ้าเป็น STAFF ต้องเลือก specialty
5. ระบบสร้างรหัสผ่านชั่วคราวแบบสุ่มและแสดงเพียงครั้งเดียว
6. รหัสผ่านถูกเก็บแบบ bcrypt hash เท่านั้น
7. เมื่อผู้ใช้ login ครั้งแรก Proxy จะส่งไป `/change-password`
8. ผู้ใช้ต้องตั้งรหัสผ่านใหม่อย่างน้อย 8 ตัว และมีทั้งตัวอักษรกับตัวเลข
9. หลังเปลี่ยนสำเร็จ ระบบ sign out เพื่อให้ login ใหม่ด้วยรหัสผ่านส่วนตัว

### การจัดการบัญชี

- ปิด public registration: `/register` redirect ไปหน้า login และ `POST /api/register` ตอบ 403
- Admin รีเซ็ตรหัสผ่านของ USER/STAFF ได้ โดยระบบออกรหัสชั่วคราวใหม่
- Admin เปิดหรือระงับบัญชีได้
- Admin ระงับบัญชีตัวเองไม่ได้
- บัญชีที่ถูกระงับ login ไม่ได้ และ JWT เดิมจะถูกทำให้ใช้ protected page/API ไม่ได้
- Staff ที่ถูกระงับจะไม่ปรากฏในรายการมอบหมาย Ticket

### การเตรียมรองรับ SSO

`User.password` เป็น nullable และมี `authProvider` กับ `externalAccountId` เพื่อเตรียมเชื่อม Microsoft/Google SSO ภายหลัง การเชื่อมบัญชีควรจับคู่จากอีเมลองค์กรที่ provider ยืนยันแล้ว เพื่อรักษา User ID, Ticket และประวัติเดิม

## 5. Process หลักของระบบ

| # | Process | สถานะในโค้ด | รายละเอียด |
|---|---|---|---|
| 1.0 | ตรวจสอบสิทธิ์และเข้าสู่ระบบ | ทำแล้ว | ตรวจสอบบัญชี สถานะบัญชี Role และบังคับเปลี่ยนรหัสผ่านครั้งแรก |
| 2.0 | รับแจ้งและวิเคราะห์ปัญหาด้วย AI | ทำแล้ว | รับข้อความ ส่งให้ Gemini วิเคราะห์ และตอบคำแนะนำ โดยเลือกโหมดตอบตรงหรือโหมด FAQ ผ่าน Environment Variable |
| 3.0 | สร้างและติดตาม Ticket | ทำแล้ว | สร้าง Ticket อัตโนมัติหรือจากการส่งต่อ และให้ผู้ใช้ติดตามรายละเอียดกับสถานะ |
| 4.0 | มอบหมาย Ticket | ทำแล้ว | Admin เลือก Staff ที่ active โดยพิจารณาหมวดปัญหาและความเชี่ยวชาญ |
| 5.0 | ดำเนินการแก้ไข Ticket | ทำแล้ว | Staff ดูงาน สนทนากับผู้ใช้ อัปเดตสถานะ และบันทึกวิธีแก้ไข |
| 6.0 | จัดการผู้ใช้และเจ้าหน้าที่ | ทำแล้ว | Admin สร้าง รีเซ็ตรหัสผ่าน เปิด–ปิดบัญชี กำหนด Role และความเชี่ยวชาญ |
| 7.0 | จัดการ FAQ | ทำแล้ว | Admin เพิ่ม แก้ไข และลบ FAQ ได้ และ AI นำฐานความรู้ไปใช้วิเคราะห์ปัญหา |
| 8.0 | ประเมินผลและออกรายงาน | ทำแล้ว | User ยืนยันผล เปิดงานกลับ ให้คะแนนและปิดเคสได้ พร้อมรายงานสรุปสำหรับ Admin |

### Process 1.0: ตรวจสอบสิทธิ์และเข้าสู่ระบบ

1. USER, STAFF หรือ ADMIN กรอกอีเมลและรหัสผ่านที่ `/login`
2. ระบบอ่านข้อมูลบัญชีจาก D1 เพื่อตรวจรหัสผ่าน สถานะบัญชี และ Role
3. ระบบสร้าง session และส่งสิทธิ์การใช้งานกลับไปยังผู้ใช้
4. ถ้า `mustChangePassword = true` ระบบส่งไป `/change-password`
5. ระบบบันทึกรหัสผ่านใหม่ลง D1 แล้วให้เข้าสู่ระบบอีกครั้ง

### Process 2.0: รับแจ้งและวิเคราะห์ปัญหาด้วย AI

1. USER ส่งข้อความแจ้งปัญหาที่ `/chat`
2. ระบบส่งข้อความให้ Gemini วิเคราะห์ผ่าน `analyzeMessage()`
3. Gemini คืน `category`, `urgency`, `confident`, `suggestedFaqId` และ `aiReplyMessage`
4. ระบบบันทึกข้อความ USER คำตอบ AI และผลวิเคราะห์ลง D3
5. ถ้า `confident = true` ระบบแสดงคำแนะนำและให้ USER ยืนยันว่าแก้ปัญหาได้หรือไม่
6. ถ้า `confident = false` ระบบสร้าง Ticket และผูกข้อความ USER/AI เข้ากับ Ticket ภายใน transaction เดียวกัน
7. หาก Gemini ใช้งานไม่ได้หรือผลลัพธ์ผิดรูปแบบ ระบบใช้ fallback response และสร้าง Ticket ส่งต่อเจ้าหน้าที่

#### โหมดการตอบของ AI

ระบบรองรับ 2 โหมดใน `lib/gemini.ts`:

| โหมด | การตั้งค่า | พฤติกรรม |
|---|---|---|
| Direct AI | ไม่กำหนด `AI_USE_FAQ` หรือค่าไม่ใช่ `true` | Gemini ใช้ความรู้ทั่วไปและแนวปฏิบัติด้าน IT Support เพื่อสร้างคำแนะนำเอง โดยไม่อ่าน FAQ |
| FAQ-assisted | `AI_USE_FAQ=true` | ระบบค้น FAQ ด้วย `keywords` แล้วส่ง FAQ ที่เกี่ยวข้องให้ Gemini สรุปเป็นคำตอบ |

สถานะปัจจุบัน ณ วันที่ 2 สิงหาคม 2026 คือ **Direct AI** เนื่องจาก `.env` ยังไม่ได้กำหนด `AI_USE_FAQ` ดังนั้น Gemini เป็นผู้สร้างคำตอบเอง ไม่ได้ดึงคำตอบจาก FAQ

ข้อจำกัดปัจจุบัน: ระบบเป็นการเลือกใช้โหมดใดโหมดหนึ่ง ยังไม่มีลำดับแบบ Hybrid ที่ค้น FAQ ก่อน แล้วจึงใช้ความรู้ทั่วไปของ Gemini เมื่อไม่พบ FAQ ที่ตรง

### Process 3.0: สร้างและติดตาม Ticket

1. ระบบสร้าง Ticket สถานะ `OPEN` เมื่อ AI ไม่มั่นใจ หรือเมื่อ USER ระบุว่าคำแนะนำแก้ปัญหาไม่ได้
2. ระบบบันทึก category, urgency และข้อมูลเจ้าของ Ticket ลง D4
3. ระบบผูกข้อความ USER และ AI ใน D3 เข้ากับ Ticket
4. USER ขอเรียกดูรายการ รายละเอียด ประวัติข้อความ และสถานะ Ticket ได้

### Process 4.0: มอบหมาย Ticket

1. ADMIN เรียกดู Ticket ที่รอมอบหมายจาก D4
2. ระบบอ่านรายชื่อ STAFF ที่ active และความเชี่ยวชาญจาก D1
3. ADMIN เลือก STAFF ให้รับผิดชอบ Ticket
4. ระบบบันทึก `assignedStaffId` และเปลี่ยนสถานะเป็น `ASSIGNED` ใน D4
5. Ticket ที่ `RESOLVED` หรือ `CLOSED` ไม่สามารถมอบหมายใหม่ได้

### Process 5.0: ดำเนินการแก้ไข Ticket

1. STAFF เรียกดู Ticket ที่ได้รับมอบหมายจาก D4
2. ระบบอ่านรายละเอียดผู้แจ้งจาก D1 และประวัติสนทนาจาก D3
3. STAFF และ USER ส่งข้อความโต้ตอบกัน โดยระบบบันทึกข้อความลง D3
4. STAFF เปลี่ยนสถานะเป็น `IN_PROGRESS` หรือ `RESOLVED`
5. STAFF บันทึก `resolutionNote` และระบบอัปเดตข้อมูลใน D4
6. USER ติดตามสถานะและข้อความตอบกลับได้ที่ `/tickets/[id]`

### Process 6.0: จัดการผู้ใช้และเจ้าหน้าที่

1. สร้างบัญชี Admin เริ่มต้นผ่าน `prisma/seed.ts`
2. ADMIN สร้างบัญชี USER หรือ STAFF ที่ `/admin/users`
3. ถ้าเป็น STAFF ต้องระบุความเชี่ยวชาญ
4. ระบบสร้างรหัสผ่านชั่วคราวและบันทึกบัญชีลง D1
5. ADMIN สามารถรีเซ็ตรหัสผ่าน เปิดใช้งาน หรือระงับบัญชีได้
6. บัญชีระบบ AI ถูกซ่อนและไม่อนุญาตให้แก้ไขผ่าน API

### Process 7.0: จัดการ FAQ

1. ADMIN เรียกดูรายการ FAQ จาก D2
2. ADMIN เพิ่ม แก้ไข หรือลบคำถาม คำตอบ หมวดหมู่ และ keywords
3. ระบบตรวจสอบข้อมูลและบันทึกการเปลี่ยนแปลงลง D2
4. ระบบส่งผลการจัดการ FAQ กลับให้ ADMIN
5. Process 2.0 อ่าน FAQ จาก D2 เพื่อนำไปวิเคราะห์ปัญหา แต่ AI ไม่เข้าถึง D2 โดยตรง

หน้าและ API สำหรับ ADMIN อยู่ที่ `/admin/faqs` และ `/api/admin/faqs`

### Process 8.0: ประเมินผลและออกรายงาน

1. STAFF เปลี่ยน Ticket เป็น `RESOLVED`
2. USER ตรวจสอบวิธีแก้และยืนยันผล
3. หากยังแก้ไม่สำเร็จ ระบบส่ง Ticket กลับเป็น `IN_PROGRESS`
4. หากสำเร็จ USER ให้คะแนน 1–5 และความคิดเห็น
5. ระบบบันทึกผลลง D5 และเปลี่ยน Ticket ใน D4 เป็น `CLOSED`
6. ADMIN ระบุเงื่อนไขหรือช่วงเวลาของรายงาน
7. ระบบอ่านข้อมูลจาก D1, D4 และ D5 เพื่อสรุปจำนวน Ticket ประสิทธิภาพเจ้าหน้าที่ และความพึงพอใจ

ผู้ใช้ประเมินผลในหน้ารายละเอียดคำร้อง และ Admin ดูรายงานได้ที่ `/admin/reports`

### Data Store สำหรับ DFD Level 1

| รหัส | Data Store | ตารางหลัก | ข้อมูลสำคัญ |
|---|---|---|---|
| D1 | ข้อมูลผู้ใช้และเจ้าหน้าที่ | `User` | บัญชี รหัสผ่าน Role สถานะบัญชี และความเชี่ยวชาญ |
| D2 | ข้อมูล FAQ | `FAQ` | คำถาม คำตอบ หมวดหมู่ และ keywords |
| D3 | ข้อมูลข้อความสนทนา | `Message` | ข้อความ USER/AI/STAFF, Ticket ที่เกี่ยวข้อง และผลวิเคราะห์ AI |
| D4 | ข้อมูล Ticket | `Ticket` | ผู้แจ้ง ผู้รับผิดชอบ หมวดปัญหา ความเร่งด่วน สถานะ และวิธีแก้ไข |
| D5 | ข้อมูลแบบประเมิน | `Evaluation` | Ticket ผู้ประเมิน คะแนน และความคิดเห็น |

External Entity ใน DFD ได้แก่ ผู้ใช้ทั่วไป เจ้าหน้าที่ ผู้ดูแลระบบ และ AI โดย External Entity ทุกตัวต้องรับส่งข้อมูลผ่าน Process และห้ามเชื่อมต่อกับ Data Store โดยตรง

## 6. Ticket Status และ Classification

สถานะ Ticket: `OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`

หมวดปัญหา: `NETWORK`, `HARDWARE`, `SOFTWARE`, `ACCOUNT`

ระดับความเร่งด่วน: `LOW`, `MEDIUM`, `HIGH`

## 7. Data Model

- `User`: identity, role, specialty, credential/SSO metadata และสถานะบัญชี
- `Ticket`: เจ้าของ ผู้รับผิดชอบ category, urgency, status และ resolution note
- `Message`: ข้อความ USER/AI/STAFF และ AI metadata
- `FAQ`: คำถาม คำตอบ category และ keywords
- `Evaluation`: คะแนน 1–5 และความคิดเห็นแบบ one-to-one ต่อ Ticket

ฟิลด์บัญชีสำคัญใน `User`:

- `password String?`
- `mustChangePassword Boolean`
- `isActive Boolean`
- `authProvider String`
- `externalAccountId String? @unique`

## 8. Routes สำคัญ

### Pages

| Route | การใช้งาน |
|---|---|
| `/login` | เข้าสู่ระบบด้วยบัญชีที่ Admin สร้าง |
| `/change-password` | เปลี่ยนรหัสผ่านชั่วคราว |
| `/chat` | แจ้งปัญหาและสนทนากับ AI |
| `/tickets`, `/tickets/[id]` | Ticket ของ USER |
| `/staff/tickets`, `/staff/tickets/[id]` | งานที่ STAFF รับผิดชอบ |
| `/admin/tickets` | มอบหมาย Ticket |
| `/admin/users` | สร้าง รีเซ็ต และระงับบัญชี |

### APIs

| Route | Method | การใช้งาน |
|---|---|---|
| `/api/admin/users` | GET, POST | อ่านรายการและสร้าง USER/STAFF |
| `/api/admin/users/[id]` | PATCH | reset password หรือเปิด/ระงับบัญชี |
| `/api/account/password` | POST | เปลี่ยนรหัสผ่านของตนเอง |
| `/api/register` | POST | ปิดใช้งานและตอบ 403 |
| `/api/messages` | GET, POST | แชทและ AI analysis |
| `/api/messages/[id]/escalate` | POST | ส่งคำตอบ AI ต่อเป็น Ticket |
| `/api/messages/[id]/resolve` | POST | บันทึกว่า AI แก้ปัญหาได้ |
| `/api/admin/tickets/[id]/assign` | POST | มอบหมาย Staff |
| `/api/staff/tickets/[id]` | GET, PATCH | อ่านและอัปเดต Ticket |

ทุก API ที่จัดการบัญชีตรวจ authentication และ authorization ฝั่ง server ไม่อาศัยเพียงการซ่อน UI

## 9. UI และ Design System

หน้าเว็บใช้ธีมหลักจาก Landing Page เป็นฐาน โดยใช้สีกรมท่า–น้ำเงิน (`#071e3d`, `#1761dc`) พื้นหลังฟ้าอ่อน และพื้นผิวการ์ดสีขาว เพื่อให้หน้าสาธารณะ ฝั่งผู้ใช้ และพื้นที่ทำงานของเจ้าหน้าที่มีภาพลักษณ์เดียวกัน

งาน UI ล่าสุดที่ทำแล้ว:

- ปรับหน้า `/tickets` ของ USER เป็นหน้า Portal พร้อมหัวข้อ ปุ่มเริ่มแชท สรุปจำนวนคำร้อง และรายการ Ticket แบบการ์ด
- ปรับหน้า `/staff/tickets` เป็น Staff Workspace พร้อมสรุปงานรอดำเนินการ กำลังแก้ไข และเสร็จสิ้น
- ปรับหน้า `/tickets/[id]` และ `/staff/tickets/[id]` ให้ข้อมูล Ticket สถานะ รายละเอียด และประวัติสนทนาอ่านง่ายขึ้น
- ปรับ Status Badge ให้แยกสถานะด้วยสีและรูปแบบเดียวกันทั้งระบบ
- ปรับฟอร์มตอบกลับ ฟอร์มอัปเดตสถานะ และช่องบันทึกวิธีแก้ไขให้เข้ากับธีมหลัก
- เพิ่ม Empty State สำหรับกรณียังไม่มี Ticket หรืองานที่ได้รับมอบหมาย
- เปลี่ยนหน้า AI Chat จากโทนม่วงให้กลับมาใช้กรมท่า–น้ำเงินตาม Landing Page
- เพิ่ม hover, focus, shadow และ transition โดยไม่เปลี่ยนพฤติกรรมเดิมของระบบ
- เพิ่ม Responsive Layout สำหรับแท็บเล็ตและมือถือ รวมถึงการจัดเรียงการ์ด ข้อมูล Ticket และปุ่มฟอร์ม

ไฟล์หลักที่แก้ไขในรอบนี้:

- `app/globals.css`
- `app/tickets/page.tsx`
- `app/tickets/[id]/page.tsx`
- `app/tickets/[id]/UserReplyForm.tsx`
- `app/staff/tickets/page.tsx`
- `app/staff/tickets/[id]/page.tsx`
- `app/staff/tickets/[id]/StaffReplyForm.tsx`
- `app/staff/tickets/[id]/UpdateTicketForm.tsx`

## 10. Environment Variables

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
AUTH_SECRET="..."
GEMINI_API_KEY="..."
# ไม่กำหนดหรือกำหนดเป็น false = Gemini ตอบจากความรู้ทั่วไป
# กำหนดเป็น true = ส่ง FAQ ที่เกี่ยวข้องให้ Gemini ใช้ประกอบคำตอบ
AI_USE_FAQ="false"
```

## 11. คำสั่งพัฒนา

```powershell
npm.cmd run dev
npm.cmd run lint
npx.cmd tsc --noEmit
npx.cmd prisma generate
npx.cmd prisma db push
npx.cmd prisma db seed
npm.cmd run build
```

การแก้ schema รอบ Admin-managed accounts ถูก sync กับฐานข้อมูล Supabase แล้วเมื่อ 14 กรกฎาคม 2026

การปรับ UI ฝั่ง USER และ STAFF ผ่าน `npm.cmd run build` แล้วเมื่อ 2 สิงหาคม 2026 โดย Next.js compile, TypeScript check และ static page generation สำเร็จ

## 12. สถานะและงานถัดไป

สิ่งที่ทำแล้ว:

- Credentials login และ role-based access
- Admin-managed USER/STAFF accounts
- Temporary password, forced password change, reset และ account suspension
- AI FAQ response และ automatic/manual escalation
- User/Admin/Staff Ticket pages และ message thread
- Evaluation UI/API และขั้นตอนให้ USER ยืนยันผลหรือเปิดงานกลับ
- หน้า Admin สำหรับจัดการ FAQ และรายงานสรุป
- Dashboard และ UI ฝั่ง Admin
- ธีมกรมท่า–น้ำเงินสำหรับ USER/STAFF พร้อม Responsive UI
- Prisma schema sync, lint, type-check และ production build

สิ่งที่ควรทำต่อก่อน Production:

- เพิ่ม automated tests สำหรับ authorization และ account lifecycle
- เพิ่ม rate limiting และ audit log สำหรับ login/reset/disable
- เพิ่ม SLA และ notification
- เพิ่ม Prisma migration history แทนการพึ่ง `db push`
- เชื่อม Microsoft Entra ID หรือ Google Workspace SSO เมื่อองค์กรพร้อม
- ทดสอบ UI แบบ end-to-end ด้วยข้อมูลจริงของ USER, STAFF และ ADMIN บนอุปกรณ์หลายขนาด
