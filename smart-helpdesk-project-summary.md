# Smart Helpdesk with AI - สรุปโปรเจกต์ปัจจุบัน

## 1. ภาพรวมโปรเจกต์

**ชื่อระบบ:** Smart Helpdesk with AI  
**ประเภทงาน:** Mini Project  
**รูปแบบระบบ:** Web application แบบ full-stack ในโปรเจกต์เดียว  
**ภาษาหลัก:** TypeScript  
**Framework หลัก:** Next.js 16 App Router

ระบบนี้เป็น Helpdesk สำหรับให้ผู้ใช้สมัครสมาชิก เข้าสู่ระบบ และแจ้งปัญหาผ่านหน้าแชท จากนั้นระบบจะบันทึกข้อความ เรียก Gemini เพื่อวิเคราะห์หมวดหมู่ ความเร่งด่วน และ FAQ ที่เกี่ยวข้อง แล้วตอบกลับผู้ใช้ผ่านข้อความ AI ในแชทเดียวกัน

สถานะปัจจุบันของโค้ด:

- มีระบบสมัครสมาชิกและเข้าสู่ระบบด้วย Auth.js/NextAuth v5
- มีหน้าแชทสำหรับผู้ใช้
- มี API สำหรับดึงและส่งข้อความ
- มี `lib/gemini.ts` สำหรับ Process 3-4: วิเคราะห์ข้อความและแนะนำ FAQ ด้วย Gemini
- มี Prisma schema สำหรับ User, Ticket, Message, FAQ และ Evaluation
- ยังไม่มีหน้าจอ/route สำหรับจัดการ Ticket, Admin, Staff และ Evaluation แบบครบ flow

---

## 2. Process หลักของระบบ

| # | Process | สถานะในโค้ดปัจจุบัน | รายละเอียด |
|---|---|---|---|
| 1 | สมัครสมาชิก / เข้าสู่ระบบ | ทำแล้วบางส่วน | สมัครสมาชิกผ่าน `app/api/register/route.ts`, login ผ่าน Auth.js credentials provider |
| 2 | แจ้งปัญหาผ่านแชท | ทำแล้ว | หน้า `app/chat/page.tsx`, hook `hooks/useChatMessages.ts`, API `app/api/messages/route.ts` |
| 3 | AI วิเคราะห์ข้อความและจัดหมวดหมู่ | ทำแล้ว | `lib/gemini.ts` เรียก Gemini และคืน `category`, `urgency`, `confident` |
| 4 | AI แนะนำ FAQ หรือข้อความตอบกลับ | ทำแล้ว | pre-filter FAQ จาก keyword ก่อนส่งเข้า Gemini แล้วบันทึกผลใน `Message.aiMeta` |
| 5 | สร้าง Ticket เมื่อ AI ไม่มั่นใจ | ยังไม่ทำ | Prisma schema รองรับแล้ว แต่ยังไม่มี API/logic สร้าง ticket จากแชท |
| 6 | Admin มอบหมายเจ้าหน้าที่ | ยังไม่ทำ | Prisma schema มี `assignedStaffId` และ `specialty` แล้ว แต่ยังไม่มีหน้าจอ |
| 7 | Staff ดำเนินการและอัปเดตสถานะ | ยังไม่ทำ | Prisma schema มี `TicketStatus` และ `resolutionNote` แล้ว |
| 8 | ผู้ใช้ประเมินผลบริการ | ยังไม่ทำ | Prisma schema มี `Evaluation` แล้ว แต่ยังไม่มี UI/API |

---

## 3. Tech Stack ที่ใช้จริง

| ส่วน | เทคโนโลยี | หมายเหตุ |
|---|---|---|
| Language | TypeScript | ใช้กับ frontend, route handlers, Prisma seed |
| Framework | Next.js 16.2.10 App Router | ใช้ `app/` directory และ Route Handlers |
| UI | React 19.2.4 + Tailwind CSS 4 | ยังไม่ได้ใช้ shadcn/ui ในโครงสร้างปัจจุบัน |
| Authentication | NextAuth/Auth.js v5 beta | ใช้ `auth()` จากไฟล์ `auth.ts` |
| Database | PostgreSQL | ตั้งค่าผ่าน `DATABASE_URL` และ `DIRECT_URL` |
| ORM | Prisma 6.19.3 | schema อยู่ที่ `prisma/schema.prisma` |
| AI | Google Gemini API | ใช้ package `@google/generative-ai` และ model `gemini-2.5-flash` |
| Password Hashing | bcryptjs | ใช้ใน register, credentials login และ seed |
| Dev tooling | ESLint, TypeScript | ตรวจด้วย `npm.cmd run lint` และ `npx.cmd tsc --noEmit` |

หมายเหตุ: path alias `@/*` ชี้ไปที่ root ของโปรเจกต์ ไม่ใช่ `src/` ตาม `tsconfig.json`

---

## 4. โครงสร้างโฟลเดอร์ปัจจุบัน

```text
smart-helpdesk/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── messages/
│   │   │   └── route.ts
│   │   └── register/
│   │       └── route.ts
│   ├── chat/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── chat/
│       ├── ChatBubble.tsx
│       └── ChatInput.tsx
├── hooks/
│   └── useChatMessages.ts
├── lib/
│   ├── constants.ts
│   ├── gemini.ts
│   └── prisma.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── auth.ts
├── middleware.ts
├── next-auth.d.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

จุดสำคัญ:

- โปรเจกต์นี้ไม่ได้ใช้ `src/`
- API อยู่ใน `app/api/**/route.ts`
- helper กลางอยู่ใน `lib/`
- Auth.js config อยู่ที่ root: `auth.ts`
- Gemini logic อยู่ที่ `lib/gemini.ts`

---

## 5. ไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|---|---|
| `auth.ts` | ตั้งค่า Auth.js/NextAuth v5 ด้วย credentials provider และ session callback |
| `app/api/auth/[...nextauth]/route.ts` | export Auth.js route handlers |
| `app/api/register/route.ts` | สมัครสมาชิกและ hash password |
| `app/api/messages/route.ts` | GET ข้อความในแชท และ POST ข้อความใหม่พร้อมข้อความตอบกลับจาก AI |
| `lib/gemini.ts` | pre-filter FAQ, สร้าง prompt, เรียก Gemini, parse JSON และ fallback เมื่อ AI ล้มเหลว |
| `lib/prisma.ts` | PrismaClient singleton สำหรับ dev hot reload |
| `lib/constants.ts` | เก็บ `AI_SYSTEM_USER_ID` |
| `hooks/useChatMessages.ts` | polling ข้อความทุก 4 วินาที และส่งข้อความจากหน้าแชท |
| `components/chat/ChatBubble.tsx` | แสดงข้อความ USER/AI/STAFF |
| `components/chat/ChatInput.tsx` | ช่องพิมพ์และปุ่มส่งข้อความ |
| `prisma/schema.prisma` | data model และ enum ของระบบ |
| `prisma/seed.ts` | seed user, AI system user, FAQ, ticket และ message ตัวอย่าง |

---

## 6. Data Model หลัก

Prisma schema ปัจจุบันมี model หลักดังนี้:

- `User`: ผู้ใช้ระบบ มี role `USER`, `STAFF`, `ADMIN`
- `Ticket`: คำร้อง/เคส รองรับ category, urgency, status, assigned staff และ resolution note
- `Message`: ข้อความในแชทหรือ ticket thread มี `senderType` และ `aiMeta`
- `FAQ`: คำถาม-คำตอบพร้อม category และ keywords สำหรับ pre-filter ก่อนส่งเข้า AI
- `Evaluation`: คะแนนและความคิดเห็นหลังปิด ticket

Enum หลัก:

- `Role`: `USER`, `STAFF`, `ADMIN`
- `Category`: `NETWORK`, `HARDWARE`, `SOFTWARE`, `ACCOUNT`
- `Urgency`: `LOW`, `MEDIUM`, `HIGH`
- `TicketStatus`: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`
- `SenderType`: `USER`, `AI`, `STAFF`

---

## 7. Flow ที่ทำงานแล้ว

### Register

1. ผู้ใช้กรอก name, email, password
2. API ตรวจข้อมูลและเช็ก email ซ้ำ
3. hash password ด้วย bcryptjs
4. สร้าง user role เริ่มต้นเป็น `USER`

### Login

1. Auth.js credentials provider รับ email/password
2. ค้นหา user จาก Prisma
3. เทียบ password ด้วย bcryptjs
4. ใส่ `id` และ `role` ลง session

### Chat + AI

1. หน้า chat เรียก `GET /api/messages` เพื่อโหลดข้อความ
2. hook ทำ polling ทุก 4 วินาที
3. เมื่อผู้ใช้ส่งข้อความ จะเรียก `POST /api/messages`
4. API บันทึกข้อความ user
5. API เรียก `analyzeMessage()` ใน `lib/gemini.ts`
6. Gemini ตอบ JSON: category, urgency, confident, suggestedFaqId, aiReplyMessage
7. API บันทึกข้อความ AI และเก็บ metadata ใน `aiMeta`
8. frontend โหลดข้อความใหม่และแสดงในแชท

---

## 8. Environment Variables

ควรมีค่าเหล่านี้ใน `.env`:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
AUTH_SECRET="..."
GEMINI_API_KEY="..."
```

หมายเหตุ: หากไม่มี `GEMINI_API_KEY` ระบบจะ fallback เป็นคำตอบส่งต่อเจ้าหน้าที่ และไม่ทำให้ request ค้าง

---

## 9. คำสั่งที่ใช้บ่อย

```bash
npm.cmd run dev
npm.cmd run lint
npx.cmd tsc --noEmit
npx.cmd prisma generate
npx.cmd prisma db seed
```

บน Windows PowerShell อาจต้องใช้ `npm.cmd` และ `npx.cmd` แทน `npm`/`npx` หาก execution policy บล็อกไฟล์ `.ps1`

---

## 10. งานถัดไปที่ควรทำ

- สร้าง logic Process 5: ถ้า `aiResult.confident === false` ให้สร้าง Ticket อัตโนมัติ
- เพิ่มหน้า list/detail ticket สำหรับ user
- เพิ่มหน้า admin สำหรับ assign staff ตาม category
- เพิ่มหน้า staff สำหรับอัปเดต status และ resolution note
- เพิ่ม API สำหรับ evaluation หลังปิด ticket
- แก้ข้อความไทยในบางไฟล์ที่ยังเป็น mojibake จาก encoding เดิม
