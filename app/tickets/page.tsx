import Link from "next/link";
import { redirect } from "next/navigation";
import { TicketStatus, type Category, type Urgency } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: "รอมอบหมาย",
  [TicketStatus.ASSIGNED]: "มอบหมายแล้ว",
  [TicketStatus.IN_PROGRESS]: "กำลังดำเนินการ",
  [TicketStatus.RESOLVED]: "แก้ไขแล้ว",
  [TicketStatus.CLOSED]: "ปิดเคส",
};

const STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: "status-open",
  [TicketStatus.ASSIGNED]: "status-assigned",
  [TicketStatus.IN_PROGRESS]: "status-in_progress",
  [TicketStatus.RESOLVED]: "status-resolved",
  [TicketStatus.CLOSED]: "status-closed",
};

const STATUS_ORDER: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.ASSIGNED,
  TicketStatus.IN_PROGRESS,
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
];

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

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const requestedStatus = (await searchParams).status;
  const selectedStatus = Object.values(TicketStatus).includes(
    requestedStatus as TicketStatus,
  )
    ? (requestedStatus as TicketStatus)
    : null;

  const tickets = await prisma.ticket.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      assignedStaff: { select: { name: true } },
      _count: { select: { messages: true } },
    },
  });

  const activeStatuses = new Set<TicketStatus>([
    TicketStatus.OPEN,
    TicketStatus.ASSIGNED,
    TicketStatus.IN_PROGRESS,
  ]);
  const completedStatuses = new Set<TicketStatus>([
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ]);
  const activeTickets = tickets.filter((ticket) => activeStatuses.has(ticket.status)).length;
  const completedTickets = tickets.filter((ticket) => completedStatuses.has(ticket.status)).length;
  const visibleTickets = selectedStatus
    ? tickets.filter((ticket) => ticket.status === selectedStatus)
    : tickets;

  return (
    <main className="portal-page ticket-list-page">
      <div className="portal-heading">
        <div>
          <span className="portal-kicker">MY SUPPORT</span>
          <h1>คำร้องของฉัน</h1>
          <p>
            รายการเคสที่ระบบสร้างจากแชทเมื่อ AI ต้องส่งต่อเจ้าหน้าที่
          </p>
        </div>
        <Link
          href="/chat"
          className="portal-primary-action"
        >
          <span aria-hidden="true">✦</span> เริ่มแชทกับ AI
        </Link>
      </div>

      <section className="ticket-overview" aria-label="ภาพรวมคำร้อง">
        <article><span>คำร้องทั้งหมด</span><strong>{tickets.length}</strong><small>รายการในระบบ</small></article>
        <article><span>กำลังดูแล</span><strong>{activeTickets}</strong><small>อยู่ระหว่างดำเนินการ</small></article>
        <article><span>ดำเนินการแล้ว</span><strong>{completedTickets}</strong><small>แก้ไขหรือปิดเคสแล้ว</small></article>
      </section>

      <nav className="status-filter" aria-label="กรองคำร้องตามสถานะ">
        <span className="status-filter-label">สถานะ</span>
        <Link
          href="/tickets"
          className={!selectedStatus ? "is-active" : undefined}
          aria-current={!selectedStatus ? "page" : undefined}
        >
          ทั้งหมด <b>{tickets.length}</b>
        </Link>
        {STATUS_ORDER.map((status) => {
          const count = tickets.filter((ticket) => ticket.status === status).length;
          return (
            <Link
              key={status}
              href={`/tickets?status=${status}`}
              className={selectedStatus === status ? "is-active" : undefined}
              aria-current={selectedStatus === status ? "page" : undefined}
            >
              {STATUS_LABEL[status]} <b>{count}</b>
            </Link>
          );
        })}
      </nav>

      {tickets.length === 0 ? (
        <div className="portal-empty">
          <span aria-hidden="true">✓</span>
          <strong>ยังไม่มีคำร้องที่ต้องติดตาม</strong>
          <p>เมื่อ AI ต้องส่งต่อปัญหาให้เจ้าหน้าที่ คำร้องจะปรากฏที่หน้านี้โดยอัตโนมัติ</p>
          <Link href="/chat">พูดคุยกับ AI</Link>
        </div>
      ) : visibleTickets.length === 0 ? (
        <div className="portal-empty portal-empty-filtered">
          <span aria-hidden="true">⌕</span>
          <strong>ไม่พบคำร้องในสถานะที่เลือก</strong>
          <p>ลองเลือกสถานะอื่น หรือดูคำร้องทั้งหมด</p>
          <Link href="/tickets">ดูคำร้องทั้งหมด</Link>
        </div>
      ) : (
        <section className="ticket-results">
          <ul className="ticket-list">
            {visibleTickets.map((ticket) => (
              <li key={ticket.id}>
              <Link
                href={`/tickets/${ticket.id}`}
                className={`ticket-list-card status-card-${ticket.status.toLowerCase()}`}
              >
                <div className="ticket-card-main">
                  <div className="ticket-card-title-row">
                    <h3>
                      {ticket.title ?? "ไม่มีหัวข้อ"}
                    </h3>
                    <span className={`status-badge ${STATUS_BADGE_CLASS[ticket.status]}`}>
                      {STATUS_LABEL[ticket.status]}
                    </span>
                  </div>
                  <p>สร้างเมื่อ {formatDate(ticket.createdAt)}</p>
                </div>

                <div className="ticket-card-meta">
                  {ticket.category && (
                    <span className="meta-category">หมวดหมู่: {CATEGORY_LABEL[ticket.category]}</span>
                  )}
                  {ticket.urgency && (
                    <span className={`meta-urgency urgency-${ticket.urgency.toLowerCase()}`}>ความเร่งด่วน: {URGENCY_LABEL[ticket.urgency]}</span>
                  )}
                  <span className="meta-messages">ข้อความ: {ticket._count.messages}</span>
                  <span className="meta-assignee">
                    เจ้าหน้าที่: {ticket.assignedStaff?.name ?? "ยังไม่ได้มอบหมาย"}
                  </span>
                </div>
                <span className="ticket-card-action">
                  ดูรายละเอียด <b aria-hidden="true">→</b>
                </span>
              </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
