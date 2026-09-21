import { SenderType, TicketStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: session.user.id },
    select: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderId: true,
          senderType: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({ messages: ticket.messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (ticket.status === TicketStatus.CLOSED) {
    return NextResponse.json(
      { error: "Ticket is closed and cannot receive new messages" },
      { status: 409 },
    );
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

  const message = await prisma.message.create({
    data: {
      ticketId: ticket.id,
      userId: session.user.id,
      senderId: session.user.id,
      senderType: SenderType.USER,
      content: trimmedContent,
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
