import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AI_SYSTEM_USER_ID } from "@/lib/constants";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateTemporaryPassword(length = 12) {
  const bytes = crypto.randomBytes(length);
  const chars = Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]);
  chars[0] = "A";
  chars[1] = "7";
  return chars.join("");
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((await getCurrentUserRole(session.user.id)) !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (id === AI_SYSTEM_USER_ID) {
    return NextResponse.json({ error: "ไม่สามารถแก้ไขบัญชีระบบ AI" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action =
    typeof body === "object" && body !== null && "action" in body
      ? (body as { action?: unknown }).action
      : undefined;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true },
  });
  if (!target) {
    return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });
  }

  if (target.role === Role.ADMIN) {
    return NextResponse.json(
      { error: "บัญชี ADMIN ต้องจัดการผ่านขั้นตอน bootstrap ที่ควบคุมโดยผู้ดูแลระบบ" },
      { status: 400 },
    );
  }

  if (action === "setActive") {
    const active = (body as { active?: unknown }).active;
    if (typeof active !== "boolean") {
      return NextResponse.json({ error: "active must be boolean" }, { status: 400 });
    }
    if (target.id === session.user.id && !active) {
      return NextResponse.json({ error: "ไม่สามารถระงับบัญชีของตัวเอง" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: active },
      select: { id: true, isActive: true },
    });
    return NextResponse.json({ user });
  }

  if (action === "resetPassword") {
    if (target.id === session.user.id) {
      return NextResponse.json(
        { error: "กรุณาเปลี่ยนรหัสผ่านของตัวเองผ่านหน้าบัญชี" },
        { status: 400 },
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    await prisma.user.update({
      where: { id },
      data: {
        password: await bcrypt.hash(temporaryPassword, 10),
        mustChangePassword: true,
        authProvider: "credentials",
        externalAccountId: null,
      },
    });
    return NextResponse.json({ temporaryPassword });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
