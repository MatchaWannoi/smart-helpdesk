# Smart Helpdesk with AI — สรุปแผนโปรเจค

## 1. ภาพรวมโปรเจค

**ชื่อระบบ:** Smart Helpdesk with AI
**ประเภทงาน:** Mini Project (งานเดี่ยว)
**หลักการ:** ระบบจัดการคำร้องและช่วยเหลือผู้ใช้งานด้วย AI ช่วยวิเคราะห์ปัญหา จัดหมวดหมู่ แนะนำ FAQ และสร้าง Ticket ส่งต่อเจ้าหน้าที่เมื่อแก้ไขเองไม่ได้ พร้อมติดตามสถานะจนปิดเคส

**เงื่อนไขจากอาจารย์:**
- งานเดี่ยว ทำระบบ
- อย่างน้อย 5-8 process ตามความยากง่ายของโปรเจค
- นำเสนอชื่อระบบ วันอังคารที่ 30/06/69
- เขียน Process คร่าวๆ ว่าทำกี่ Process อะไรบ้าง

---

## 2. Process หลัก (8 ขั้นตอน)

| # | Process | ความยาก | รายละเอียด |
|---|---------|---------|-----------|
| 1 | สมัครสมาชิก / เข้าสู่ระบบ | ง่าย | Auth พื้นฐาน แยก 3 บทบาท: ผู้ใช้ / เจ้าหน้าที่ / ผู้ดูแล |
| 2 | แจ้งปัญหา/สร้างคำร้อง (แชทไม่ real-time) | ง่าย-ปานกลาง | หน้าตาเป็น chat bubble บันทึกเป็น message list + poll ดึงข้อความใหม่ทุก 3-5 วิ ไม่ใช้ WebSocket |
| 3 | AI วิเคราะห์ข้อความและจัดหมวดหมู่ปัญหา | **ยากที่สุด** | เรียก Gemini API (ฟรี) ส่ง prompt กำหนดหมวดหมู่ล่วงหน้า (เครือข่าย/ฮาร์ดแวร์/ซอฟต์แวร์/บัญชีผู้ใช้) ให้ตอบกลับเป็น JSON ระบุหมวดหมู่ + ความเร่งด่วน |
| 4 | ระบบแนะนำ FAQ หรือแนวทางแก้ไขเบื้องต้น | ปานกลาง | ส่งรายการ FAQ ทั้งหมดไปพร้อม prompt เดียวกับ process 3 ให้ AI เลือกคำตอบที่ใกล้เคียงที่สุด (รวม logic กับ process 3 ในฟังก์ชันเดียว) |
| 5 | หากยังแก้ไขไม่ได้ ระบบสร้าง Ticket | ง่าย | เปลี่ยนสถานะอัตโนมัติเมื่อ AI ไม่มั่นใจ หรือผู้ใช้กด "ยังแก้ไม่ได้" |
| 6 | ผู้ดูแลมอบหมายเจ้าหน้าที่รับผิดชอบ | ปานกลาง | เลือกจาก dropdown ตามหมวดหมู่ที่ AI จัดไว้ |
| 7 | เจ้าหน้าที่ดำเนินการและอัปเดตสถานะ | ง่าย-ปานกลาง | หน้าจอเจ้าหน้าที่เปลี่ยนสถานะ Ticket + บันทึกการแก้ไข |
| 8 | ผู้ใช้ประเมินผลการให้บริการ | ง่าย | ให้คะแนน 1-5 ดาว ผูกกับ Ticket ที่ปิดแล้ว |

---

## 3. Tech Stack ที่เลือก

เลือก **Next.js เดี่ยว** (Frontend + Backend ในโปรเจคเดียว) เพื่อลดความเสี่ยงด้านเวลา แต่ยังได้เรียนรู้เทคโนโลยีใหม่ครบ

| ส่วน | เทคโนโลยี | เหตุผล |
|---|---|---|
| Framework | Next.js (App Router) | Frontend + Backend (API Routes) ในตัวเดียว ไม่ต้อง setup 2 โปรเจค |
| ฐานข้อมูล | PostgreSQL (หรือ SQLite ตอน dev) | รองรับ relational data ของ Ticket/User/FAQ |
| ORM | Prisma | เขียน schema ง่าย, type-safe, ลดบั๊ก query |
| Authentication | NextAuth.js (Auth.js) | Role-based session สำเร็จรูป |
| UI/Styling | Tailwind CSS + shadcn/ui | ได้หน้าตาสวยเร็ว |
| AI API | **Google AI Studio (Gemini API) — ฟรีถาวร** | โควตาราว 1,500 request/วัน (Gemini Flash), ตอบ JSON ได้แม่นยำ, รองรับภาษาไทย |
| AI สำรอง | Groq (ฟรีถาวร) | เผื่อไว้กรณี Gemini มีปัญหาวันนำเสนอ |
| Hosting (ถ้าต้อง deploy) | Vercel (ฟรี) | Deploy จาก Next.js ได้ทันที |

**หมายเหตุสำคัญ:** อย่าใส่ข้อมูลจริงของผู้ใช้ตอนทดสอบ/นำเสนอ เพราะผู้ให้บริการ AI ฟรีบางรายอาจเก็บ prompt ไปใช้พัฒนาโมเดล ให้ใช้ mock data แทน

---

## 4. Folder Structure

```
smart-helpdesk/
│
├── prisma/
│   ├── schema.prisma              # User, Ticket, Message, FAQ, Category
│   └── seed.ts                    # ข้อมูลตัวอย่างสำหรับ demo
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   │
│   │   ├── (main)/
│   │   │   ├── chat/page.tsx                 # Process 2
│   │   │   ├── tickets/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx             # Process 8 (ประเมินผล)
│   │   │   ├── admin/
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── assign/page.tsx           # Process 6
│   │   │   │   └── faq/page.tsx
│   │   │   └── staff/
│   │   │       └── my-tickets/page.tsx       # Process 7
│   │   │
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts   # Process 1
│   │   │   ├── messages/route.ts             # Process 2 (POST/GET, polling)
│   │   │   ├── ai/analyze/route.ts           # Process 3-4 (เรียก Gemini)
│   │   │   ├── tickets/
│   │   │   │   ├── route.ts                  # Process 5
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts              # Process 7
│   │   │   │       └── assign/route.ts       # Process 6
│   │   │   └── evaluations/route.ts          # Process 8
│   │   │
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui
│   │   ├── chat/ (ChatWindow, ChatBubble, ChatInput)
│   │   ├── tickets/ (TicketCard, TicketStatusBadge, EvaluationForm)
│   │   └── dashboard/StatsChart.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── gemini.ts                # ฟังก์ชันหลักเรียก Gemini API + prompt template
│   │   └── utils.ts
│   │
│   └── types/index.ts
│
├── .env.local                      # DATABASE_URL, GEMINI_API_KEY, NEXTAUTH_SECRET
└── package.json
```

**จุดสำคัญ:** `src/lib/gemini.ts` คือไฟล์หัวใจของระบบ ทำ process 3 และ 4 พร้อมกันในฟังก์ชันเดียว (รับข้อความ → ส่งพร้อมรายการ FAQ → รับ JSON กลับที่มีหมวดหมู่ + ความเร่งด่วน + FAQ ที่ใกล้เคียง)

---

## 5. แผนการดำเนินงาน (3 สัปดาห์)

**สัปดาห์ที่ 1**
- วันที่ 1-2: ออกแบบฐานข้อมูล (`schema.prisma`) + ทำระบบ login/role
- วันที่ 3-5: ทำหน้าแชทแจ้งปัญหา + ตาราง Messages + polling

**สัปดาห์ที่ 2 (จุดเสี่ยงที่สุด — เริ่มแต่เช้าสัปดาห์)**
- วันที่ 6: สมัคร Google AI Studio, ขอ API key, ทดสอบเรียก Gemini แบบง่ายก่อน
- วันที่ 7-9: ออกแบบ prompt ให้วิเคราะห์ข้อความ + ตอบ JSON (หมวดหมู่/ความเร่งด่วน/FAQ)
- วันที่ 10-11: เชื่อมผลลัพธ์ AI เข้ากับหน้าแชท ให้ตอบกลับพร้อมปุ่ม "แก้ไขแล้ว" / "ยังไม่หาย"

**สัปดาห์ที่ 3**
- วันที่ 12-13: Process 5-6 (สร้าง Ticket อัตโนมัติ + มอบหมายเจ้าหน้าที่)
- วันที่ 14-16: Process 7-8 (อัปเดตสถานะ + ประเมินผล)
- วันที่ 17-18: ทดสอบระบบทั้งหมด (UAT), แก้บั๊ก, เตรียม slide นำเสนอ

---

## 6. ความเสี่ยงที่ต้องระวัง

- **Process 3-4 (AI)** เป็นจุดเสี่ยงสูงสุด ควรเริ่มทดสอบเชื่อม Gemini API ตั้งแต่ต้นสัปดาห์ที่ 2 ไม่ปล่อยไว้ท้ายสุด
- Gemini free tier มีโควตาจำกัดต่อวัน ต้องมี error handling รองรับ ถ้า API ล้มเหลวให้ fallback สร้าง Ticket แบบไม่ระบุหมวดหมู่ ไม่ให้ระบบค้าง
- ห้ามใส่ข้อมูลจริงตอน demo เพราะ AI ฟรีบางเจ้าอาจเก็บ prompt ไปใช้เทรนโมเดล ใช้ mock data แทน

---

## 7. ขั้นตอนต่อไป

- [ ] ร่าง `prisma/schema.prisma` ฉบับเต็ม
- [ ] ร่าง prompt ตัวอย่างสำหรับเรียก Gemini API (รับข้อความจากแชท → ตอบ JSON หมวดหมู่ + FAQ)
- [ ] เริ่มเขียนโค้ด Process 1 (Auth) ก่อนตามลำดับที่วางไว้
