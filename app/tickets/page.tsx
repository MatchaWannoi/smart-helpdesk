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

export default async function TicketsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

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

      {tickets.length === 0 ? (
        <div className="portal-empty">
          <span aria-hidden="true">✓</span>
          <strong>ยังไม่มีคำร้องที่ต้องติดตาม</strong>
          <p>เมื่อ AI ต้องส่งต่อปัญหาให้เจ้าหน้าที่ คำร้องจะปรากฏที่หน้านี้โดยอัตโนมัติ</p>
          <Link href="/chat">พูดคุยกับ AI</Link>
        </div>
      ) : (
        <ul className="ticket-list">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/tickets/${ticket.id}`}
                className="ticket-list-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2>
                      {ticket.title ?? "ไม่มีหัวข้อ"}
                    </h2>
                    <p>
                      สร้างเมื่อ {formatDate(ticket.createdAt)}
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
                  <span>
                    เจ้าหน้าที่: {ticket.assignedStaff?.name ?? "ยังไม่ได้มอบหมาย"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
