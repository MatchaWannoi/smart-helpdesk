import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Category, Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AI_SYSTEM_USER_ID } from "@/lib/constants";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";

const CREATABLE_ROLES = new Set<Role>([Role.USER, Role.STAFF]);
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateTemporaryPassword(length = 12) {
  const bytes = crypto.randomBytes(length);
  const chars = Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]);
  chars[0] = "A";
  chars[1] = "7";
  return chars.join("");
}

async function authorizeAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = await getCurrentUserRole(session.user.id);
  return role === Role.ADMIN ? session.user.id : null;
}

export async function GET() {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { id: { not: AI_SYSTEM_USER_ID } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      specialty: true,
      isActive: true,
      mustChangePassword: true,
      authProvider: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, email, role, specialty } =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (normalizedName.length < 2 || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: "กรุณากรอกชื่อและอีเมลให้ถูกต้อง" }, { status: 400 });
  }

  if (typeof role !== "string" || !CREATABLE_ROLES.has(role as Role)) {
    return NextResponse.json({ error: "สร้างได้เฉพาะบัญชี USER หรือ STAFF" }, { status: 400 });
  }

  const selectedRole = role as Role;
  let selectedSpecialty: Category | null = null;

  if (selectedRole === Role.STAFF) {
    if (
      typeof specialty !== "string" ||
      !Object.values(Category).includes(specialty as Category)
    ) {
      return NextResponse.json({ error: "กรุณาระบุความเชี่ยวชาญของเจ้าหน้าที่" }, { status: 400 });
    }
    selectedSpecialty = specialty as Category;
  }

  const temporaryPassword = generateTemporaryPassword();

  try {
    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        password: await bcrypt.hash(temporaryPassword, 10),
        role: selectedRole,
        specialty: selectedSpecialty,
        mustChangePassword: true,
        isActive: true,
        authProvider: "credentials",
      },
      select: { id: true, name: true, email: true, role: true, specialty: true },
    });

    return NextResponse.json({ user, temporaryPassword }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "อีเมลนี้มีบัญชีอยู่แล้ว" }, { status: 409 });
    }
    console.error("Create managed user error:", error);
    return NextResponse.json({ error: "สร้างบัญชีไม่สำเร็จ" }, { status: 500 });
  }
}
