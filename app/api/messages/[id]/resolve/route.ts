import { Category, SenderType, Urgency } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type StoredAiMeta = {
  category?: Category | null;
  urgency?: Urgency | null;
  confident?: boolean;
  suggestedFaqId?: string | null;
  startedAt?: string;
  userFeedback?: "resolved" | "escalated";
  resolvedAt?: string;
};

function getAiMeta(value: unknown): StoredAiMeta {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
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
      { error: "ข้อความนี้ถูกส่งต่อเป็น ticket แล้ว" },
      { status: 409 },
    );
  }

  const aiMeta = getAiMeta(aiMessage.aiMeta);

  if (aiMeta.confident !== true) {
    return NextResponse.json(
      { error: "ข้อความนี้ไม่อยู่ในขั้นตอนยืนยันผลการแก้ไข" },
      { status: 400 },
    );
  }

  if (aiMeta.userFeedback) {
    return NextResponse.json(
      { error: "ข้อความนี้ได้รับการยืนยันผลแล้ว" },
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

  const resolvedAt = new Date();
  const updatedMessage = await prisma.message.update({
    where: { id },
    data: {
      aiMeta: {
        ...aiMeta,
        startedAt: aiMeta.startedAt ?? userMessage.createdAt.toISOString(),
        userFeedback: "resolved",
        resolvedAt: resolvedAt.toISOString(),
      },
    },
  });

  return NextResponse.json({ message: updatedMessage, ticketId: null });
}
