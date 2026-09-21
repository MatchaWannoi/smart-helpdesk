import { Role, TicketStatus, type Category, type Urgency } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { TicketMessageThread } from "@/components/tickets/TicketMessageThread";
import type { ChatMessage } from "@/hooks/useChatMessages";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";
import { StaffReplyForm } from "./StaffReplyForm";
import { UpdateTicketForm } from "./UpdateTicketForm";
import { ResolutionTime } from "@/components/tickets/ResolutionTime";
import { TicketStatusRefresh } from "@/components/tickets/TicketStatusRefresh";

const STATUS_LABEL: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: "รอมอบหมาย",
  [TicketStatus.ASSIGNED]: "มอบหมายแล้ว",
  [TicketStatus.IN_PROGRESS]: "กำลังดำเนินการ",
  [TicketStatus.RESOLVED]: "แก้ไขแล้ว",
  [TicketStatus.CLOSED]: "ปิดเคส",
};

const CATEGORY_LABEL: Record<Category, string> = {
  NETWORK: "เครือข่าย",
  HARDWARE: "ฮาร์ดแวร์",
  SOFTWARE: "ซอฟต์แวร์",
  ACCOUNT: "บัญชีผู้ใช้",
};

const URGENCY_LABEL: Record<Urgency, string> = {
  LOW: "ต่ำ",
  MEDIUM: "ปานกลาง",
  HIGH: "สูง",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

export default async function StaffTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = await getCurrentUserRole(session.user.id);

  if (role !== Role.STAFF) {
    redirect("/chat");
  }

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket || ticket.assignedStaffId !== session.user.id) {
    notFound();
  }

  const chatMessages: ChatMessage[] = ticket.messages.map((message) => ({
    id: message.id,
    senderId: message.senderId,
    senderType: message.senderType,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }));

  return (
    <main className="portal-page ticket-detail-page staff-portal">
      <TicketStatusRefresh
        ticketId={ticket.id}
        endpoint={`/api/staff/tickets/${ticket.id}`}
        initialSnapshot={JSON.stringify({
          status: ticket.status,
          assignedStaffId: ticket.assignedStaffId,
          updatedAt: ticket.updatedAt.toISOString(),
        })}
      />
      <Link
        href="/staff/tickets"
        className="portal-back"
      >
        ← กลับไปหน้างานของฉัน
      </Link>

      <section className="ticket-detail-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="portal-kicker">ASSIGNED TICKET</span>
            <h1>
              {ticket.title ?? "ไม่มีหัวข้อ"}
            </h1>
            <p>
              แจ้งโดย {ticket.user.name} ({ticket.user.email})
            </p>
          </div>
          <span className={`status-badge status-${ticket.status.toLowerCase()}`}>
            {STATUS_LABEL[ticket.status]}
          </span>
        </div>

        <dl className="ticket-detail-facts">
          <div><dt>สร้างเมื่อ</dt><dd>{formatDate(ticket.createdAt)}</dd></div>
          <div><dt>หมวดหมู่</dt><dd>{ticket.category ? CATEGORY_LABEL[ticket.category] : "ไม่ระบุ"}</dd></div>
          <div><dt>ความเร่งด่วน</dt><dd>{ticket.urgency ? URGENCY_LABEL[ticket.urgency] : "ไม่ระบุ"}</dd></div>
          <div><dt>ระยะเวลาดำเนินการ</dt><dd><ResolutionTime startedAt={ticket.createdAt.toISOString()} endedAt={ticket.closedAt?.toISOString()} /></dd></div>
        </dl>

        <div className="staff-update-panel">
          <UpdateTicketForm
            ticketId={ticket.id}
            currentStatus={ticket.status}
            currentResolutionNote={ticket.resolutionNote}
          />
        </div>
      </section>

      <section className="ticket-conversation">
        <TicketMessageThread
          ticketId={ticket.id}
          endpoint={`/api/staff/tickets/${ticket.id}/messages`}
          initialMessages={chatMessages}
          currentUserId={session.user.id}
          viewerRole="STAFF"
        />
      </section>

      <StaffReplyForm
        ticketId={ticket.id}
        disabled={ticket.status === TicketStatus.CLOSED}
      />
    </main>
  );
}
