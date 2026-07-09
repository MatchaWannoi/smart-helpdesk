import { Role, TicketStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";

const VALID_STAFF_STATUSES = new Set<TicketStatus>([
  TicketStatus.ASSIGNED,
  TicketStatus.IN_PROGRESS,
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
]);

async function authorizeStaff() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized" as const, status: 401 as const };
  }

  const role = await getCurrentUserRole(session.user.id);

  if (role !== Role.STAFF) {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  return { staffId: session.user.id };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authorizeStaff();

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      assignedStaff: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket || ticket.assignedStaffId !== authResult.staffId) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authorizeStaff();

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id } });

  if (!ticket || ticket.assignedStaffId !== authResult.staffId) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status, resolutionNote } =
    typeof body === "object" && body !== null
      ? (body as { status?: unknown; resolutionNote?: unknown })
      : {};

  const data: {
    status?: TicketStatus;
    resolutionNote?: string | null;
    closedAt?: Date | null;
  } = {};

  if (status !== undefined) {
    if (
      typeof status !== "string" ||
      !VALID_STAFF_STATUSES.has(status as TicketStatus)
    ) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    data.status = status as TicketStatus;
    data.closedAt = status === TicketStatus.CLOSED ? new Date() : null;
  }

  if (resolutionNote !== undefined) {
    if (resolutionNote !== null && typeof resolutionNote !== "string") {
      return NextResponse.json(
        { error: "resolutionNote must be a string or null" },
        { status: 400 },
      );
    }

    data.resolutionNote =
      typeof resolutionNote === "string" ? resolutionNote.trim() || null : null;
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data,
    include: {
      user: { select: { name: true, email: true } },
      assignedStaff: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ ticket: updatedTicket });
}
