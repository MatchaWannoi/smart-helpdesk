import { Role, TicketStatus, type Category, type Urgency } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";
import { AssignStaffForm } from "./AssignStaffForm";

const STATUS_LABEL: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: "Open",
  [TicketStatus.ASSIGNED]: "Assigned",
  [TicketStatus.IN_PROGRESS]: "In progress",
  [TicketStatus.RESOLVED]: "Resolved",
  [TicketStatus.CLOSED]: "Closed",
};

const STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  [TicketStatus.ASSIGNED]:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  [TicketStatus.IN_PROGRESS]:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  [TicketStatus.RESOLVED]:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  [TicketStatus.CLOSED]:
    "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const CATEGORY_LABEL: Record<Category, string> = {
  NETWORK: "Network",
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  ACCOUNT: "Account",
};

const URGENCY_LABEL: Record<Urgency, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const LOCKED_STATUSES = new Set<TicketStatus>([
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
]);

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

export default async function AdminTicketsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = await getCurrentUserRole(session.user.id);

  if (role !== Role.ADMIN) {
    redirect("/chat");
  }

  const [tickets, staffList] = await Promise.all([
    prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        assignedStaff: { select: { id: true, name: true, specialty: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: Role.STAFF },
      select: { id: true, name: true, specialty: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Admin ticket assignment
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review all tickets and assign them to staff members.
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
          No tickets found.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {ticket.title ?? "Untitled ticket"}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Created by {ticket.user.name} ({ticket.user.email}) on{" "}
                    {formatDate(ticket.createdAt)}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[ticket.status]}`}
                >
                  {STATUS_LABEL[ticket.status]}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span>ID: {ticket.id}</span>
                {ticket.category && (
                  <span>Category: {CATEGORY_LABEL[ticket.category]}</span>
                )}
                {ticket.urgency && (
                  <span>Urgency: {URGENCY_LABEL[ticket.urgency]}</span>
                )}
                <span>Messages: {ticket._count.messages}</span>
                <span>
                  Current staff: {ticket.assignedStaff?.name ?? "Unassigned"}
                </span>
              </div>

              <div className="mt-4">
                <AssignStaffForm
                  ticketId={ticket.id}
                  staffList={staffList}
                  currentStaffId={ticket.assignedStaffId}
                  suggestedCategory={ticket.category}
                  isLocked={LOCKED_STATUSES.has(ticket.status)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
