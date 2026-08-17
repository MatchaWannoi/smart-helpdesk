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

export default async function StaffTicketsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = await getCurrentUserRole(session.user.id);

  if (role !== Role.STAFF) {
    redirect("/chat");
  }

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

      {tickets.length === 0 ? (
        <div className="portal-empty">
          <span aria-hidden="true">✓</span>
          <strong>ไม่มีงานค้างในขณะนี้</strong>
          <p>คำร้องที่ได้รับมอบหมายใหม่จะแสดงที่หน้านี้</p>
        </div>
      ) : (
        <ul className="ticket-list">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/staff/tickets/${ticket.id}`}
                className="ticket-list-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2>
                      {ticket.title ?? "ไม่มีหัวข้อ"}
                    </h2>
                    <p>
                      แจ้งโดย {ticket.user.name} ({ticket.user.email})
                    </p>
                  </div>
                  <span
                    className={`status-badge ${STATUS_BADGE_CLASS[ticket.status]}`}
                  >
                    {STATUS_LABEL[ticket.status]}
                  </span>
                </div>

                <div className="ticket-card-meta">
                  {ticket.category && (
                    <span>หมวดหมู่: {CATEGORY_LABEL[ticket.category]}</span>
                  )}
                  {ticket.urgency && (
                    <span>ความเร่งด่วน: {URGENCY_LABEL[ticket.urgency]}</span>
                  )}
                  <span>ข้อความ: {ticket._count.messages}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
