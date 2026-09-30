import Link from "next/link";
import { redirect } from "next/navigation";
import { Role, TicketStatus, Urgency, type Category } from "@prisma/client";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";

const CATEGORY_LABEL: Record<Category, string> = {
  NETWORK: "เครือข่าย", HARDWARE: "ฮาร์ดแวร์", SOFTWARE: "ซอฟต์แวร์", ACCOUNT: "บัญชีผู้ใช้",
};
const CATEGORY_ICON: Record<Category, string> = { NETWORK: "NW", HARDWARE: "HW", SOFTWARE: "SW", ACCOUNT: "AC" };
const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "รอมอบหมาย", ASSIGNED: "มอบหมายแล้ว", IN_PROGRESS: "กำลังดำเนินการ", RESOLVED: "แก้ไขแล้ว", CLOSED: "ปิดเคส",
};
const STATUS_ORDER = [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED];

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(date);
}

function getBangkokTodayStart() {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Bangkok" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${value.year}-${value.month}-${value.day}T00:00:00+07:00`);
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((await getCurrentUserRole(session.user.id)) !== Role.ADMIN) redirect("/chat");

  const [ticketCount, waitingCount, activeCount, completedCount, urgentCount, todayCount, userCount, staffCount, recentTickets, statusGroups, categoryGroups, evaluation] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
    prisma.ticket.count({ where: { status: { in: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS] } } }),
    prisma.ticket.count({ where: { status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } } }),
    prisma.ticket.count({ where: { urgency: Urgency.HIGH, status: TicketStatus.OPEN, assignedStaffId: null } }),
    prisma.ticket.count({ where: { createdAt: { gte: getBangkokTodayStart() } } }),
    prisma.user.count({ where: { isActive: true, role: Role.USER } }),
    prisma.user.count({ where: { isActive: true, role: Role.STAFF } }),
    prisma.ticket.findMany({ take: 6, orderBy: { updatedAt: "desc" }, include: { user: { select: { name: true } }, assignedStaff: { select: { name: true } } } }),
    prisma.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.evaluation.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
  ]);

  const completedPercent = ticketCount ? Math.round((completedCount / ticketCount) * 100) : 0;
  const statusCounts = new Map(statusGroups.map((group) => [group.status, group._count._all]));
  const categories = categoryGroups
    .filter((group): group is typeof group & { category: Category } => Boolean(group.category))
    .sort((a, b) => b._count._all - a._count._all);
  const maxCategoryCount = Math.max(...categories.map((group) => group._count._all), 1);
  const displayName = session.user.name?.split(" ")[0] || "ผู้ดูแลระบบ";

  return (
    <main className="admin-dashboard">
      <header className="dashboard-welcome">
        <div><span className="dashboard-eyebrow">ADMIN OVERVIEW</span><h1>สวัสดี, {displayName}</h1><p>ติดตามภาพรวมงาน Helpdesk และรายการที่ต้องจัดการได้จากหน้าจอนี้</p></div>
        <div className="dashboard-header-actions">
          <Link className="dashboard-secondary-action" href="/admin/reports">ดูรายงาน</Link>
          <Link className="dashboard-primary-action" href="/admin/tickets?status=OPEN">จัดการคำร้องรอมอบหมาย <span>→</span></Link>
        </div>
      </header>

      <section className="admin-stat-grid" aria-label="ตัวเลขภาพรวมระบบ">
        <article className="stat-card stat-card-total"><span className="stat-icon">▦</span><div><small>คำร้องทั้งหมด</small><strong>{ticketCount.toLocaleString("th-TH")}</strong><p>เพิ่มวันนี้ {todayCount.toLocaleString("th-TH")} รายการ</p></div></article>
        <article className="stat-card stat-card-waiting"><span className="stat-icon">!</span><div><small>รอมอบหมาย</small><strong>{waitingCount.toLocaleString("th-TH")}</strong><p>{waitingCount ? "ควรตรวจสอบและมอบหมาย" : "ไม่มีงานค้างมอบหมาย"}</p></div></article>
        <article className="stat-card stat-card-active"><span className="stat-icon">↻</span><div><small>กำลังดูแล</small><strong>{activeCount.toLocaleString("th-TH")}</strong><p>โดยเจ้าหน้าที่ {staffCount.toLocaleString("th-TH")} คน</p></div></article>
        <article className="stat-card stat-card-success"><span className="stat-icon">✓</span><div><small>อัตราดำเนินการสำเร็จ</small><strong>{completedPercent}%</strong><p>{completedCount.toLocaleString("th-TH")} รายการแก้ไขหรือปิดแล้ว</p></div></article>
      </section>

      {waitingCount > 0 && (
        <section className="dashboard-priority" aria-label="คำร้องที่ยังไม่ได้มอบหมาย">
          <div className="priority-copy"><span className="priority-icon">!</span><div><small>ต้องดำเนินการ</small><strong>มีคำร้องที่ยังไม่ได้มอบหมาย {waitingCount.toLocaleString("th-TH")} รายการ{urgentCount > 0 ? ` · เร่งด่วน ${urgentCount.toLocaleString("th-TH")} รายการ` : ""}</strong></div></div>
          <Link href="/admin/tickets?status=OPEN">มอบหมายคำร้อง <span>→</span></Link>
        </section>
      )}

      <div className="dashboard-insight-grid">
        <section className="dashboard-panel status-overview">
          <div className="dashboard-panel-heading"><div><span>WORKLOAD</span><h2>สถานะคำร้อง</h2></div><strong>{ticketCount.toLocaleString("th-TH")} <small>ทั้งหมด</small></strong></div>
          <div className="status-stack" aria-hidden="true">{STATUS_ORDER.map((status) => { const count = statusCounts.get(status) ?? 0; return <i key={status} className={`status-segment status-${status.toLowerCase()}`} style={{ width: `${ticketCount ? (count / ticketCount) * 100 : 0}%` }} />; })}</div>
          <div className="dashboard-status-list">{STATUS_ORDER.map((status) => { const count = statusCounts.get(status) ?? 0; return <Link key={status} href={`/admin/tickets?status=${status}`}><span className={`status-dot status-${status.toLowerCase()}`} /><span>{STATUS_LABEL[status]}</span><b>{count.toLocaleString("th-TH")}</b><small>{ticketCount ? Math.round((count / ticketCount) * 100) : 0}%</small></Link>; })}</div>
        </section>

        <section className="dashboard-panel category-overview">
          <div className="dashboard-panel-heading"><div><span>CATEGORIES</span><h2>ประเภทปัญหาที่พบ</h2></div></div>
          <div className="dashboard-category-list">{categories.length === 0 ? <div className="admin-empty">ยังไม่มีข้อมูลหมวดหมู่</div> : categories.map((group) => <div key={group.category}><span className="category-code">{CATEGORY_ICON[group.category]}</span><div><strong>{CATEGORY_LABEL[group.category]}</strong><i><b style={{ width: `${(group._count._all / maxCategoryCount) * 100}%` }} /></i></div><span>{group._count._all.toLocaleString("th-TH")}</span></div>)}</div>
        </section>

        <aside className="dashboard-panel dashboard-health">
          <div className="dashboard-panel-heading"><div><span>SERVICE HEALTH</span><h2>ภาพรวมบริการ</h2></div></div>
          <div className="health-score"><strong>{evaluation._avg.rating?.toFixed(1) ?? "—"}</strong><span>/ 5</span><small>คะแนนความพึงพอใจ</small></div>
          <dl><div><dt>ผลประเมิน</dt><dd>{evaluation._count._all.toLocaleString("th-TH")}</dd></div><div><dt>ผู้ใช้งาน</dt><dd>{userCount.toLocaleString("th-TH")}</dd></div><div><dt>เจ้าหน้าที่</dt><dd>{staffCount.toLocaleString("th-TH")}</dd></div></dl>
          <Link href="/admin/reports">ดูรายงานฉบับเต็ม <span>→</span></Link>
        </aside>
      </div>

      <div className="admin-dashboard-grid">
        <section className="dashboard-panel admin-recent">
          <div className="dashboard-panel-heading"><div><span>RECENT ACTIVITY</span><h2>อัปเดตล่าสุด</h2></div><Link href="/admin/tickets">ดูทั้งหมด →</Link></div>
          {recentTickets.length === 0 ? <div className="admin-empty">ยังไม่มีคำร้องในระบบ</div> : <div className="recent-list">{recentTickets.map((ticket) => <Link key={ticket.id} href={`/admin/tickets?status=${ticket.status}`} className="recent-row"><span className="recent-symbol">{ticket.category ? CATEGORY_ICON[ticket.category] : "IT"}</span><div className="recent-copy"><strong>{ticket.title || "ไม่มีหัวข้อ"}</strong><small>แจ้งโดย {ticket.user.name} · {ticket.assignedStaff?.name ? `ดูแลโดย ${ticket.assignedStaff.name}` : "ยังไม่มอบหมาย"}</small></div><div className="recent-meta"><span data-status={ticket.status}>{STATUS_LABEL[ticket.status]}</span><time>{formatDate(ticket.updatedAt)}</time></div></Link>)}</div>}
        </section>

        <aside className="dashboard-panel admin-quick">
          <div className="dashboard-panel-heading"><div><span>QUICK ACTIONS</span><h2>เมนูจัดการ</h2></div></div>
          <Link href="/admin/tickets?status=OPEN"><span className="quick-icon">▤</span><div><strong>มอบหมายคำร้อง</strong><small>{waitingCount} รายการกำลังรอดำเนินการ</small></div><b>›</b></Link>
          <Link href="/admin/users"><span className="quick-icon">♙</span><div><strong>จัดการบัญชีผู้ใช้</strong><small>{userCount + staffCount} บัญชีที่เปิดใช้งาน</small></div><b>›</b></Link>
          <Link href="/admin/faqs"><span className="quick-icon">?</span><div><strong>จัดการฐานความรู้</strong><small>ปรับปรุงคำตอบ FAQ สำหรับระบบ</small></div><b>›</b></Link>
          <Link href="/admin/reports"><span className="quick-icon">↗</span><div><strong>รายงานประสิทธิภาพ</strong><small>วิเคราะห์สถานะและผลงานเจ้าหน้าที่</small></div><b>›</b></Link>
        </aside>
      </div>
    </main>
  );
}
