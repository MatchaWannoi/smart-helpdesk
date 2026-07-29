import { Role, TicketStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";

const LOCKED_STATUSES = new Set<TicketStatus>([
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getCurrentUserRole(session.user.id);

  if (role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const staffId =
    typeof body === "object" && body !== null && "staffId" in body
      ? (body as { staffId?: unknown }).staffId
      : undefined;

  if (typeof staffId !== "string" || !staffId.trim()) {
    return NextResponse.json(
      { error: "staffId is required" },
      { status: 400 },
    );
  }

  const [ticket, staff] = await Promise.all([
    prisma.ticket.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { id: staffId } }),
  ]);

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (LOCKED_STATUSES.has(ticket.status)) {
    return NextResponse.json(
      { error: "Ticket is resolved or closed and cannot be assigned" },
      { status: 409 },
    );
  }

  if (!staff || staff.role !== Role.STAFF || !staff.isActive) {
    return NextResponse.json({ error: "Staff not found" }, { status: 400 });
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: {
      assignedStaffId: staff.id,
      status: TicketStatus.ASSIGNED,
    },
    include: {
      assignedStaff: { select: { id: true, name: true, specialty: true } },
    },
  });

  return NextResponse.json({ ticket: updatedTicket });
}
