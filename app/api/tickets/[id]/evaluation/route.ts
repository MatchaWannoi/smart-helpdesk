import { TicketStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRating } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const ticket = await prisma.ticket.findFirst({ where: { id, userId: session.user.id } });
  if (!ticket) return NextResponse.json({ error: "ไม่พบคำร้อง" }, { status: 404 });
  if (ticket.status !== TicketStatus.RESOLVED) {
    return NextResponse.json({ error: "ประเมินได้เฉพาะคำร้องที่เจ้าหน้าที่แก้ไขแล้ว" }, { status: 409 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const resolved = body?.resolved === true;
  if (!resolved) {
    await prisma.ticket.update({ where: { id }, data: { status: TicketStatus.IN_PROGRESS, closedAt: null } });
    return NextResponse.json({ status: TicketStatus.IN_PROGRESS });
  }
  const rating = normalizeRating(body?.rating);
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";
  if (rating === null) return NextResponse.json({ error: "กรุณาให้คะแนน 1–5 ดาว" }, { status: 400 });
  await prisma.$transaction([
    prisma.evaluation.upsert({
      where: { ticketId: id },
      create: { ticketId: id, userId: session.user.id, rating, comment: comment || null },
      update: { rating, comment: comment || null },
    }),
    prisma.ticket.update({ where: { id }, data: { status: TicketStatus.CLOSED, closedAt: new Date() } }),
  ]);
  return NextResponse.json({ status: TicketStatus.CLOSED });
}
