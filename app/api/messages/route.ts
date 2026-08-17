import { SenderType } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AI_SYSTEM_USER_ID, MAX_MESSAGE_LENGTH } from "@/lib/constants";
import { analyzeMessage } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await prisma.message.findMany({
    where: {
      userId: session.user.id,
      ticketId: null,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
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

  const content =
    typeof body === "object" && body !== null && "content" in body
      ? (body as { content?: unknown }).content
      : undefined;

  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 },
    );
  }

  const trimmedContent = content.trim();

  if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `ข้อความต้องไม่เกิน ${MAX_MESSAGE_LENGTH.toLocaleString()} ตัวอักษร` },
      { status: 400 },
    );
  }

  // เรียก AI วิเคราะห์ก่อน เพื่อให้รู้ผล confident ก่อนตัดสินใจสร้าง ticket
  const aiResult = await analyzeMessage(trimmedContent);

  // Process 5: ถ้า AI ไม่มั่นใจ (confident === false) ต้องสร้าง Ticket แน่นอน
  // แล้วผูกทั้งข้อความ user และข้อความตอบกลับของ AI รอบนี้เข้ากับ ticket ทันที
  // (ห่อทั้งหมดไว้ใน transaction เดียวกันเพื่อความ atomic)
  const { userMessage, aiMessage, ticketId } = await prisma.$transaction(
    async (tx) => {
      let ticketId: string | null = null;

      if (!aiResult.confident) {
        const ticket = await tx.ticket.create({
          data: {
            userId: session.user.id,
            category: aiResult.category,
            urgency: aiResult.urgency,
            aiConfident: false,
            // ใช้ข้อความแรกที่ผู้ใช้พิมพ์เป็น title เบื้องต้น (ตัดความยาวไว้กันยาวเกิน)
            title: trimmedContent.slice(0, 80),
          },
        });
        ticketId = ticket.id;
      }

      const userMessage = await tx.message.create({
        data: {
          userId: session.user.id,
          senderId: session.user.id,
          senderType: SenderType.USER,
          content: trimmedContent,
          ticketId,
        },
      });

      const aiMessage = await tx.message.create({
        data: {
          userId: session.user.id,
          senderId: AI_SYSTEM_USER_ID,
          senderType: SenderType.AI,
          content: aiResult.aiReplyMessage,
          ticketId,
          aiMeta: {
            category: aiResult.category,
            urgency: aiResult.urgency,
            confident: aiResult.confident,
            suggestedFaqId: aiResult.suggestedFaqId,
          },
        },
      });

      return { userMessage, aiMessage, ticketId };
    },
  );

  return NextResponse.json(
    { userMessage, aiMessage, aiResult, ticketId },
    { status: 201 },
  );
}
