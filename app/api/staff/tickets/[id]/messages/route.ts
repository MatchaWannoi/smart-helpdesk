import { Role, SenderType } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getCurrentUserRole(session.user.id);

  if (role !== Role.STAFF) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id } });

  if (!ticket || ticket.assignedStaffId !== session.user.id) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
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
      ticketId: ticket.id,
      userId: ticket.userId,
      senderId: session.user.id,
      senderType: SenderType.STAFF,
      content: content.trim(),
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
