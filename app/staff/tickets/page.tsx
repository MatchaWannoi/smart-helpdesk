import { Role, TicketStatus, type Category, type Urgency } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
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

export default async function StaffTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = await getCurrentUserRole(session.user.id);

  if (role !== Role.STAFF) {
    redirect("/chat");
  }

  const requestedStatus = (await searchParams).status;
  const selectedStatus = Object.values(TicketStatus).includes(
    requestedStatus as TicketStatus,
  )
    ? (requestedStatus as TicketStatus)
    : null;

  const tickets = await prisma.ticket.findMany({
    where: { assignedStaffId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { messages: true } },
    },
  });

  const inProgress = tickets.filter((ticket) => ticket.status === TicketStatus.IN_PROGRESS).length;
  const waitingStatuses = new Set<TicketStatus>([
    TicketStatus.OPEN,
    TicketStatus.ASSIGNED,
  ]);
  const completedStatuses = new Set<TicketStatus>([
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ]);
  const waiting = tickets.filter((ticket) => waitingStatuses.has(ticket.status)).length;
  const completed = tickets.filter((ticket) => completedStatuses.has(ticket.status)).length;
  const visibleTickets = selectedStatus
    ? tickets.filter((ticket) => ticket.status === selectedStatus)
    : tickets;

  return (
    <main className="portal-page ticket-list-page staff-portal">
      <div className="portal-heading">
        <div>
          <span className="portal-kicker">STAFF WORKSPACE</span>
          <h1>งานที่ฉันดูแล</h1>
          <p>
          รายการ ticket ที่ถูกมอบหมายให้คุณดำเนินการ
          </p>
        </div>
        <span className="staff-ready"><i /> พร้อมให้บริการ</span>
      </div>

      <section className="ticket-overview" aria-label="ภาพรวมงาน">
        <article><span>รอดำเนินการ</span><strong>{waiting}</strong><small>งานที่รับเข้ามาใหม่</small></article>
        <article><span>กำลังแก้ไข</span><strong>{inProgress}</strong><small>งานที่กำลังดำเนินการ</small></article>
        <article><span>เสร็จสิ้น</span><strong>{completed}</strong><small>งานที่ดูแลเรียบร้อย</small></article>
      </section>

      <nav className="status-filter" aria-label="กรองงานตามสถานะ">
        <span className="status-filter-label">สถานะ</span>
        <Link
          href="/staff/tickets"
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
              href={`/staff/tickets?status=${status}`}
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
          <strong>ไม่มีงานค้างในขณะนี้</strong>
          <p>คำร้องที่ได้รับมอบหมายใหม่จะแสดงที่หน้านี้</p>
        </div>
      ) : visibleTickets.length === 0 ? (
        <div className="portal-empty portal-empty-filtered">
          <span aria-hidden="true">⌕</span>
          <strong>ไม่พบงานในสถานะที่เลือก</strong>
          <p>ลองเลือกสถานะอื่น หรือดูงานทั้งหมด</p>
          <Link href="/staff/tickets">ดูงานทั้งหมด</Link>
        </div>
      ) : (
        <section className="ticket-results">
          <ul className="ticket-list">
            {visibleTickets.map((ticket) => (
              <li key={ticket.id}>
              <Link
                href={`/staff/tickets/${ticket.id}`}
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
                  <p>แจ้งโดย {ticket.user.name} ({ticket.user.email})</p>
                </div>

                <div className="ticket-card-meta">
                  {ticket.category && (
                    <span className="meta-category">หมวดหมู่: {CATEGORY_LABEL[ticket.category]}</span>
                  )}
                  {ticket.urgency && (
                    <span className={`meta-urgency urgency-${ticket.urgency.toLowerCase()}`}>ความเร่งด่วน: {URGENCY_LABEL[ticket.urgency]}</span>
                  )}
                  <span className="meta-messages">ข้อความ: {ticket._count.messages}</span>
                </div>
                <span className="ticket-card-action">
                  เปิดงาน <b aria-hidden="true">→</b>
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
