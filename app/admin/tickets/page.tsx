import { Role, TicketStatus, type Category, type Urgency } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";
import { AssignStaffForm } from "./AssignStaffForm";

const STATUS_LABEL: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: "รอมอบหมาย",
  [TicketStatus.ASSIGNED]: "มอบหมายแล้ว",
  [TicketStatus.IN_PROGRESS]: "กำลังดำเนินการ",
  [TicketStatus.RESOLVED]: "แก้ไขแล้ว",
  [TicketStatus.CLOSED]: "ปิดเคส",
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

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = await getCurrentUserRole(session.user.id);

  if (role !== Role.ADMIN) {
    redirect("/chat");
  }

  const requestedStatus = (await searchParams).status;
  const selectedStatus = Object.values(TicketStatus).includes(
    requestedStatus as TicketStatus,
  )
    ? (requestedStatus as TicketStatus)
    : null;

  const [tickets, staffList] = await Promise.all([
    prisma.ticket.findMany({
      where: selectedStatus ? { status: selectedStatus } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        assignedStaff: { select: { id: true, name: true, specialty: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: Role.STAFF, isActive: true },
      select: { id: true, name: true, specialty: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="admin-tickets-page">
      <div className="admin-tickets-heading">
        <div>
          <span>TICKET MANAGEMENT</span>
          <h1>
          จัดการและมอบหมายคำร้อง
          </h1>
          <p>
          ตรวจสอบคำร้องทั้งหมดและมอบหมายให้เจ้าหน้าที่ที่เหมาะสม
          </p>
        </div>
        <div className="ticket-heading-actions">
          <form className="ticket-filter" method="get">
            <span className="filter-icon">⌕</span>
            <div className="ticket-filter-controls">
              <select name="status" defaultValue={selectedStatus ?? ""} aria-label="กรองคำร้องตามสถานะ">
                <option value="">ทุกสถานะ</option>
                {Object.values(TicketStatus).map((status) => (
                  <option key={status} value={status}>{STATUS_LABEL[status]}</option>
                ))}
              </select>
              <button type="submit">กรอง</button>
              {selectedStatus && <Link href="/admin/tickets" title="ล้างตัวกรอง">ล้าง</Link>}
            </div>
            <span className="filter-result">{tickets.length} รายการ</span>
          </form>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="admin-ticket-empty">
          ไม่พบคำร้องในสถานะที่เลือก
        </div>
      ) : (
        <ul className="admin-ticket-list">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className={`admin-ticket-card ${LOCKED_STATUSES.has(ticket.status) ? "is-locked" : ""}`}
            >
              <div className="ticket-card-head">
                <div>
                  <h2>
                    {ticket.title ?? "ไม่มีหัวข้อ"}
                  </h2>
                  <p>
                    แจ้งโดย {ticket.user.name} ({ticket.user.email}) เมื่อ{" "}
                    {formatDate(ticket.createdAt)}
                  </p>
                </div>
                <span
                  className={`ticket-status ${STATUS_BADGE_CLASS[ticket.status]}`}
                >
                  {STATUS_LABEL[ticket.status]}
                </span>
              </div>

              <div className="ticket-facts">
                <div><span>ID</span><strong>{ticket.id}</strong></div>
                {ticket.category && (
                  <div><span>หมวดหมู่</span><strong>{CATEGORY_LABEL[ticket.category]}</strong></div>
                )}
                {ticket.urgency && (
                  <div><span>ความเร่งด่วน</span><strong className={`urgency-${ticket.urgency.toLowerCase()}`}>{URGENCY_LABEL[ticket.urgency]}</strong></div>
                )}
                <div><span>เจ้าหน้าที่</span><strong>{ticket.assignedStaff?.name ?? "ยังไม่ได้มอบหมาย"}</strong></div>
                <div><span>ข้อความ</span><strong>{ticket._count.messages} ข้อความ</strong></div>
              </div>

              <div className="ticket-assignment">
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
