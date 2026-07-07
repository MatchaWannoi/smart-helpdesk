import { SenderType } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
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

  const message = await prisma.message.create({
    data: {
      userId: session.user.id,
      senderId: session.user.id,
      senderType: SenderType.USER,
      content: content.trim(),
    },
  });

  // Process 3-4 will create an AI reply here. The reply must keep this
  // session user as userId and use AI_SYSTEM_USER_ID as senderId.

  return NextResponse.json({ message }, { status: 201 });
}
