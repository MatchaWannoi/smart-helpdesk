import { PrismaClient, Role, Category, Urgency, TicketStatus, SenderType } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AI_SYSTEM_USER_ID } from "../lib/constants";

const prisma = new PrismaClient();

async function seedAiSystemUser() {
  const aiSystemUser = await prisma.user.upsert({
    where: { id: AI_SYSTEM_USER_ID },
    update: {},
    create: {
      id: AI_SYSTEM_USER_ID,
      name: "AI Assistant",
      email: "ai-system@internal.local",
      password: await bcrypt.hash(crypto.randomUUID(), 10),
      role: "ADMIN",
    },
  });
  console.log("✓ Seeded AI system user");
  return aiSystemUser;
}
async function main() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error(
      "Seed นี้จะล้างข้อมูลเดิมทั้งหมด กรุณาตั้ง ALLOW_DESTRUCTIVE_SEED=true ก่อนรัน",
    );
  }

  console.log("🌱 เริ่ม seed ข้อมูล...");

  // ==========================================
  // 1. ล้างข้อมูลเก่าก่อน (เผื่อรัน seed ซ้ำ)
  // ==========================================
  // ลำดับการลบสำคัญ! ต้องลบตัวที่ "ถูกอ้างอิง" (FK) ก่อนตัวที่ "ถูกอ้างถึง"
  await prisma.evaluation.deleteMany();
  await prisma.message.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.fAQ.deleteMany();
  await prisma.user.deleteMany();

  // ==========================================
  // 2. สร้าง User (3 บทบาท)
  // ==========================================
  // hash password ด้วย bcrypt ก่อนเก็บ ห้ามเก็บ plain text เด็ดขาด
  const hashedPassword = await bcrypt.hash("Demo1234!", 10);

  const admin = await prisma.user.create({
    data: {
      name: "แอดมิน สมชาย",
      email: "admin@helpdesk.com",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  const staffNetwork = await prisma.user.create({
    data: {
      name: "เจ้าหน้าที่ สมหญิง (เครือข่าย)",
      email: "staff.network@helpdesk.com",
      password: hashedPassword,
      role: Role.STAFF,
      specialty: Category.NETWORK,
    },
  });

  const staffSoftware = await prisma.user.create({
    data: {
      name: "เจ้าหน้าที่ สมศักดิ์ (ซอฟต์แวร์)",
      email: "staff.software@helpdesk.com",
      password: hashedPassword,
      role: Role.STAFF,
      specialty: Category.SOFTWARE,
    },
  });

  const normalUser = await prisma.user.create({
    data: {
      name: "ผู้ใช้ทั่วไป สมปอง",
      email: "user@helpdesk.com",
      password: hashedPassword,
      role: Role.USER,
    },
  });

  const aiSystemUser = await seedAiSystemUser();

  console.log("✅ สร้าง User แล้ว:", { admin: admin.email, staffNetwork: staffNetwork.email, staffSoftware: staffSoftware.email, normalUser: normalUser.email });

  // ==========================================
  // 3. สร้าง FAQ ตัวอย่าง
  // ==========================================
  const faqs = await prisma.fAQ.createMany({
    data: [
      {
        question: "อินเทอร์เน็ตช้าต้องทำอย่างไร",
        answer: "ลองรีสตาร์ทเราเตอร์โดยถอดปลั๊กทิ้งไว้ 10 วินาทีแล้วเสียบใหม่ หากยังช้าอยู่ให้ตรวจสอบจำนวนอุปกรณ์ที่เชื่อมต่อพร้อมกัน",
        category: Category.NETWORK,
        keywords: ["อินเทอร์เน็ต", "เน็ตช้า", "wifi", "เราเตอร์"],
      },
      {
        question: "เชื่อมต่อ Wi-Fi ไม่ได้",
        answer: "ตรวจสอบว่าใส่รหัสผ่านถูกต้อง และลองลืมเครือข่าย (forget network) แล้วเชื่อมต่อใหม่อีกครั้ง",
        category: Category.NETWORK,
        keywords: ["wifi", "เชื่อมต่อไม่ได้", "รหัสผ่าน"],
      },
      {
        question: "คอมพิวเตอร์เปิดไม่ติด",
        answer: "ตรวจสอบสายไฟและปลั๊กว่าเสียบแน่นดี ลองเปลี่ยนปลั๊กที่ใช้งานได้แน่นอน หากไฟไม่ติดเลยอาจต้องแจ้งเจ้าหน้าที่",
        category: Category.HARDWARE,
        keywords: ["เปิดไม่ติด", "คอม", "ไฟไม่เข้า"],
      },
      {
        question: "เครื่องพิมพ์ไม่พิมพ์งาน",
        answer: "ตรวจสอบว่ากระดาษหมดหรือไม่ ตลับหมึกยังมีเหลืออยู่หรือไม่ และเครื่องพิมพ์เชื่อมต่อกับคอมพิวเตอร์ถูกต้อง",
        category: Category.HARDWARE,
        keywords: ["ปริ้นเตอร์", "เครื่องพิมพ์", "พิมพ์ไม่ออก"],
      },
      {
        question: "โปรแกรมค้าง ไม่ตอบสนอง",
        answer: "ลองปิดโปรแกรมผ่าน Task Manager (Ctrl+Shift+Esc) แล้วเปิดใหม่ หากค้างบ่อยควรอัปเดตโปรแกรมเป็นเวอร์ชันล่าสุด",
        category: Category.SOFTWARE,
        keywords: ["โปรแกรมค้าง", "แฮง", "ไม่ตอบสนอง"],
      },
      {
        question: "ลืมรหัสผ่านเข้าระบบ",
        answer: "กดปุ่ม 'ลืมรหัสผ่าน' ที่หน้า login แล้วระบบจะส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลที่ลงทะเบียนไว้",
        category: Category.ACCOUNT,
        keywords: ["ลืมรหัสผ่าน", "login ไม่ได้", "reset password"],
      },
    ],
  });

  console.log(`✅ สร้าง FAQ แล้ว: ${faqs.count} ข้อ`);
  console.log("✅ สร้าง Message ตัวอย่างแล้ว");
  console.log("🎉 Seed ข้อมูลเสร็จสมบูรณ์!");
  console.log("\n📌 บัญชีทดสอบ (password ทุกคนคือ: Demo1234!)");
  console.log("   Admin:  admin@helpdesk.com");
  console.log("   Staff:  staff.network@helpdesk.com / staff.software@helpdesk.com");
  console.log("   User:   user@helpdesk.com");
}

main()
  .catch((e) => {
    console.error("❌ Seed ล้มเหลว:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
