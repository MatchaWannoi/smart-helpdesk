import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function isStrongEnough(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { currentPassword, newPassword } =
    typeof body === "object" && body !== null
      ? (body as { currentPassword?: unknown; newPassword?: unknown })
      : {};

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "กรุณากรอกรหัสผ่านให้ครบ" }, { status: 400 });
  }

  if (!isStrongEnough(newPassword)) {
    return NextResponse.json(
      { error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัว และมีทั้งตัวอักษรกับตัวเลข" },
      { status: 400 },
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านชั่วคราว" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user?.isActive || !user.password) {
    return NextResponse.json({ error: "ไม่พบบัญชีที่ใช้งานได้" }, { status: 404 });
  }

  const currentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!currentPasswordValid) {
    return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(newPassword, 10),
      mustChangePassword: false,
    },
  });

  return NextResponse.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
}
