import Link from "next/link";
import { redirect } from "next/navigation";
import { Role, TicketStatus, type Category } from "@prisma/client";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";

const CATEGORY_LABEL: Record<Category, string> = {
  NETWORK: "เครือข่าย",
  HARDWARE: "ฮาร์ดแวร์",
  SOFTWARE: "ซอฟต์แวร์",
  ACCOUNT: "บัญชีผู้ใช้",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "รอมอบหมาย",
  ASSIGNED: "มอบหมายแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  RESOLVED: "แก้ไขแล้ว",
  CLOSED: "ปิดเคส",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((await getCurrentUserRole(session.user.id)) !== Role.ADMIN) redirect("/chat");

  const [ticketCount, waitingCount, activeCount, completedCount, userCount, recentTickets] =
    await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
      prisma.ticket.count({ where: { status: { in: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS] } } }),
      prisma.ticket.count({ where: { status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } } }),
      prisma.user.count({ where: { isActive: true, role: { not: Role.ADMIN } } }),
      prisma.ticket.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { user: { select: { name: true } }, assignedStaff: { select: { name: true } } },
      }),
    ]);

  const completedPercent = ticketCount ? Math.round((completedCount / ticketCount) * 100) : 0;

  return (
    <main className="admin-dashboard">
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <span className="admin-kicker">POWERED BY ADVANCED AI</span>
          <h1>จัดการงานไอที<br/><em>ง่ายขึ้นกว่าเดิม</em></h1>
          <p>ภาพรวมคำร้องและการดำเนินงานทั้งหมด ช่วยให้คุณมอบหมายเจ้าหน้าที่และติดตามปัญหาได้จากที่เดียว</p>
          <div className="admin-hero-actions">
            <Link href="/admin/tickets">จัดการคำร้อง <span>→</span></Link>
            <Link href="/admin/users">จัดการผู้ใช้งาน</Link>
          </div>
        </div>
        <div className="admin-hero-bot" aria-hidden="true">
          <div className="admin-bot-screen">
            <span className="bot-antenna"/>
            <div className="bot-face"><i/><i/></div>
            <b>AI</b>
          </div>
          <span className="bot-online">● Online</span>
        </div>
      </section>

      <section className="admin-stat-grid">
        <article><span className="stat-icon purple">▦</span><div><small>คำร้องทั้งหมด</small><strong>{ticketCount.toLocaleString("th-TH")}</strong><p>ทุกคำร้องในระบบ</p></div></article>
        <article><span className="stat-icon amber">◷</span><div><small>รอมอบหมาย</small><strong>{waitingCount.toLocaleString("th-TH")}</strong><p>ต้องตรวจสอบและมอบหมาย</p></div></article>
        <article><span className="stat-icon blue">↻</span><div><small>กำลังดำเนินการ</small><strong>{activeCount.toLocaleString("th-TH")}</strong><p>อยู่ในความดูแลของเจ้าหน้าที่</p></div></article>
        <article><span className="stat-icon green">✓</span><div><small>ดำเนินการสำเร็จ</small><strong>{completedPercent}%</strong><p>{completedCount.toLocaleString("th-TH")} คำร้องที่แก้ไขหรือปิดแล้ว</p></div></article>
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-recent">
          <div className="section-title"><div><span>RECENT ACTIVITY</span><h2>คำร้องที่อัปเดตล่าสุด</h2></div><Link href="/admin/tickets">ดูทั้งหมด →</Link></div>
          {recentTickets.length === 0 ? (
            <div className="admin-empty">ยังไม่มีคำร้องในระบบ</div>
          ) : (
            <div className="recent-list">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="recent-row">
                  <span className="recent-symbol">{ticket.category ? CATEGORY_LABEL[ticket.category].charAt(0) : "IT"}</span>
                  <div className="recent-copy"><strong>{ticket.title || "ไม่มีหัวข้อ"}</strong><small>แจ้งโดย {ticket.user.name} · {ticket.assignedStaff?.name ? `ดูแลโดย ${ticket.assignedStaff.name}` : "ยังไม่มอบหมาย"}</small></div>
                  <div className="recent-meta"><span data-status={ticket.status}>{STATUS_LABEL[ticket.status]}</span><time>{formatDate(ticket.updatedAt)}</time></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="admin-quick">
          <div className="quick-heading"><span>QUICK ACTIONS</span><h2>จัดการระบบ</h2></div>
          <Link href="/admin/tickets"><span className="quick-icon">▤</span><div><strong>มอบหมายคำร้อง</strong><small>{waitingCount} รายการกำลังรอดำเนินการ</small></div><b>›</b></Link>
          <Link href="/admin/users"><span className="quick-icon">♙</span><div><strong>บัญชีผู้ใช้งาน</strong><small>{userCount} บัญชีที่เปิดใช้งาน</small></div><b>›</b></Link>
          <Link href="/change-password"><span className="quick-icon">⌁</span><div><strong>ความปลอดภัย</strong><small>เปลี่ยนรหัสผ่านผู้ดูแล</small></div><b>›</b></Link>
          <div className="system-ready"><i/>ระบบพร้อมให้บริการ</div>
        </aside>
      </div>
    </main>
  );
}
