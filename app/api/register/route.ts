import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // ----- 1. ตรวจสอบข้อมูลเบื้องต้น -----
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" },
        { status: 400 }
      );
    }

    // ----- 2. เช็คว่า email นี้มีคนใช้ไปแล้วหรือยัง -----
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "อีเมลนี้ถูกใช้งานแล้ว" },
        { status: 409 } // 409 Conflict = ข้อมูลชนกับที่มีอยู่แล้ว
      );
    }

    // ----- 3. Hash password ก่อนเก็บ (ห้ามเก็บ plain text เด็ดขาด) -----
    const hashedPassword = await bcrypt.hash(password, 10);

    // ----- 4. สร้าง user ใหม่ -----
    // role ไม่รับจาก request เด็ดขาด! ต้อง fix เป็น USER เสมอ
    // ไม่งั้นคนร้ายจะส่ง role: "ADMIN" มาสมัครเป็นแอดมินได้เอง
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        // role ไม่ใส่ตรงนี้ → ใช้ค่า @default(USER) จาก schema.prisma อัตโนมัติ
      },
    });

    // ----- 5. ตอบกลับ (ไม่ส่ง password กลับไปเด็ดขาด) -----
    return NextResponse.json(
      {
        message: "สมัครสมาชิกสำเร็จ",
        user: { id: user.id, name: user.name, email: user.email },
      },
      { status: 201 } // 201 Created = สร้างข้อมูลใหม่สำเร็จ
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
