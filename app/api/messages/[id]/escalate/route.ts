import { Category, SenderType, Urgency } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type StoredAiMeta = {
  category?: Category;
  urgency?: Urgency;
  confident?: boolean;
  suggestedFaqId?: string | null;
  startedAt?: string;
};

function getAiMeta(value: unknown): StoredAiMeta | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as StoredAiMeta;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const aiMessage = await prisma.message.findUnique({ where: { id } });

  if (
    !aiMessage ||
    aiMessage.userId !== session.user.id ||
    aiMessage.senderType !== SenderType.AI
  ) {
    return NextResponse.json({ error: "ไม่พบข้อความนี้" }, { status: 404 });
  }

  if (aiMessage.ticketId) {
    return NextResponse.json(
      { error: "ข้อความนี้ถูกส่งต่อเป็น ticket ไปแล้ว" },
      { status: 409 },
    );
  }

  const userMessage = await prisma.message.findFirst({
    where: {
      userId: session.user.id,
      ticketId: null,
      senderType: SenderType.USER,
      createdAt: { lte: aiMessage.createdAt },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!userMessage) {
    return NextResponse.json(
      { error: "หาข้อความต้นเรื่องไม่เจอ" },
      { status: 400 },
    );
  }

  const aiMeta = getAiMeta(aiMessage.aiMeta);
  const recordedStart = aiMeta?.startedAt ? new Date(aiMeta.startedAt) : null;
  const issueStartedAt = recordedStart && !Number.isNaN(recordedStart.getTime())
    ? recordedStart
    : userMessage.createdAt;

  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        userId: session.user.id,
        category: aiMeta?.category ?? null,
        urgency: aiMeta?.urgency ?? null,
        aiConfident: false,
        title: userMessage.content.slice(0, 80),
        createdAt: issueStartedAt,
      },
    });

    const updatedUserMessage = await tx.message.update({
      where: { id: userMessage.id },
      data: { ticketId: ticket.id },
    });

    const updatedAiMessage = await tx.message.update({
      where: { id: aiMessage.id },
      data: { ticketId: ticket.id },
    });

    return {
      ticketId: ticket.id,
      userMessage: updatedUserMessage,
      aiMessage: updatedAiMessage,
    };
  });

  return NextResponse.json(result);
}
