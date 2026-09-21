import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TicketStatus, type Category, type Urgency } from "@prisma/client";
import { auth } from "@/auth";
import { TicketMessageThread } from "@/components/tickets/TicketMessageThread";
import type { ChatMessage } from "@/hooks/useChatMessages";
import { prisma } from "@/lib/prisma";
import { UserReplyForm } from "./UserReplyForm";
import { EvaluationForm } from "./EvaluationForm";
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

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      assignedStaff: { select: { name: true } },
      evaluation: true,
    },
  });

  if (!ticket) {
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
    <main className="portal-page ticket-detail-page">
      <TicketStatusRefresh
        ticketId={ticket.id}
        initialSnapshot={JSON.stringify({
          status: ticket.status,
          assignedStaffId: ticket.assignedStaffId,
          updatedAt: ticket.updatedAt.toISOString(),
        })}
      />
      <Link
        href="/tickets"
        className="portal-back"
      >
        ← กลับไปหน้าคำร้องของฉัน
      </Link>

      <section className="ticket-detail-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="portal-kicker">TICKET DETAIL</span>
            <h1>
              {ticket.title ?? "ไม่มีหัวข้อ"}
            </h1>
            <p>
              สร้างเมื่อ {formatDate(ticket.createdAt)}
            </p>
          </div>
          <span className={`status-badge status-${ticket.status.toLowerCase()}`}>
            {STATUS_LABEL[ticket.status]}
          </span>
        </div>

        <dl className="ticket-detail-facts">
          <div><dt>หมวดหมู่</dt><dd>{ticket.category ? CATEGORY_LABEL[ticket.category] : "ไม่ระบุ"}</dd></div>
          <div><dt>ความเร่งด่วน</dt><dd>{ticket.urgency ? URGENCY_LABEL[ticket.urgency] : "ไม่ระบุ"}</dd></div>
          <div><dt>เจ้าหน้าที่</dt><dd>{ticket.assignedStaff?.name ?? "ยังไม่ได้มอบหมาย"}</dd></div>
          <div><dt>ระยะเวลาดำเนินการ</dt><dd><ResolutionTime startedAt={ticket.createdAt.toISOString()} endedAt={ticket.closedAt?.toISOString()} /></dd></div>
        </dl>

        {ticket.resolutionNote && (
          <div className="resolution-note">
            <span className="font-medium">วิธีแก้ไข: </span>
            {ticket.resolutionNote}
          </div>
        )}
      </section>

      <section className="ticket-conversation">
        <TicketMessageThread
          ticketId={ticket.id}
          endpoint={`/api/tickets/${ticket.id}/messages`}
          initialMessages={chatMessages}
          currentUserId={session.user.id}
          viewerRole="USER"
        />
      </section>

      {ticket.status === TicketStatus.RESOLVED && <EvaluationForm ticketId={ticket.id} />}
      {ticket.evaluation && (
        <section className="evaluation-summary">
          <strong>ผลประเมินการบริการ</strong><span>{"★".repeat(ticket.evaluation.rating)}{"☆".repeat(5 - ticket.evaluation.rating)}</span>
          {ticket.evaluation.comment && <p>{ticket.evaluation.comment}</p>}
        </section>
      )}

      <UserReplyForm
        ticketId={ticket.id}
        disabled={ticket.status === TicketStatus.CLOSED}
      />
    </main>
  );
}
