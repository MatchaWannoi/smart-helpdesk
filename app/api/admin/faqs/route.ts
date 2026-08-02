import { Category, Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";

async function isAdmin() {
  const session = await auth();
  return !!session?.user?.id && (await getCurrentUserRole(session.user.id)) === Role.ADMIN;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  const category = typeof body?.category === "string" && Object.values(Category).includes(body.category as Category)
    ? body.category as Category : null;
  const keywords = Array.isArray(body?.keywords)
    ? body.keywords.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
  if (question.length < 5 || answer.length < 5) {
    return NextResponse.json({ error: "คำถามและคำตอบต้องมีอย่างน้อย 5 ตัวอักษร" }, { status: 400 });
  }
  const faq = await prisma.fAQ.create({ data: { question, answer, category, keywords } });
  return NextResponse.json({ faq }, { status: 201 });
}
