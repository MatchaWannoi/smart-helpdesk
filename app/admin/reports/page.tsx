import { Prisma, Role, TicketStatus, Urgency, type Category } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";
import { formatAverageDuration, formatDetailedDuration } from "@/lib/report-duration";

const CATEGORY: Record<Category, string> = { NETWORK: "เครือข่าย", HARDWARE: "ฮาร์ดแวร์", SOFTWARE: "ซอฟต์แวร์", ACCOUNT: "บัญชีผู้ใช้" };
const STATUS: Record<TicketStatus, string> = { OPEN: "รอมอบหมาย", ASSIGNED: "มอบหมายแล้ว", IN_PROGRESS: "กำลังดำเนินการ", RESOLVED: "แก้ไขแล้ว", CLOSED: "ปิดเคส" };
const URGENCY: Record<Urgency, string> = { HIGH: "สูง", MEDIUM: "ปานกลาง", LOW: "ต่ำ" };
const STATUS_ORDER = [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED];
const URGENCY_ORDER = [Urgency.HIGH, Urgency.MEDIUM, Urgency.LOW];
const DONE_STATUSES = new Set<TicketStatus>([TicketStatus.RESOLVED, TicketStatus.CLOSED]);
const REPORT_TYPES = {
  overview: { label: "ภาพรวมระบบ", description: "สรุปข้อมูลบัญชี คำร้อง สถานะ และผลประเมิน" },
  tickets: { label: "ข้อมูลคำร้อง", description: "รายละเอียด สถานะ หมวดหมู่ ความเร่งด่วน และเวลาแก้ไข" },
  staff: { label: "รายงานเจ้าหน้าที่", description: "ข้อมูลบัญชีเจ้าหน้าที่และภาระงานที่รับผิดชอบ" },
  users: { label: "รายงานผู้ใช้", description: "ข้อมูลบัญชีผู้ใช้และจำนวนคำร้องที่แจ้ง" },
  evaluation: { label: "ผลแบบประเมิน", description: "คะแนน ความคิดเห็น และความพึงพอใจของผู้ใช้" },
} as const;
type ReportType = keyof typeof REPORT_TYPES;

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Bangkok" }).format(date);
}

function shortDate(date: Date) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" }).format(date);
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; category?: string; urgency?: string; reportType?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((await getCurrentUserRole(session.user.id)) !== Role.ADMIN) redirect("/chat");

  const filters = await searchParams;
  const from = filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? new Date(`${filters.from}T00:00:00+07:00`) : null;
  const to = filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? new Date(`${filters.to}T23:59:59+07:00`) : null;
  const selectedCategory = filters.category && Object.keys(CATEGORY).includes(filters.category) ? filters.category as Category : null;
  const selectedUrgency = filters.urgency && Object.values(Urgency).includes(filters.urgency as Urgency) ? filters.urgency as Urgency : null;
  const reportType: ReportType = filters.reportType && filters.reportType in REPORT_TYPES ? filters.reportType as ReportType : "overview";
  const where: Prisma.TicketWhereInput = {
    ...(selectedCategory ? { category: selectedCategory } : {}),
    ...(selectedUrgency ? { urgency: selectedUrgency } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [tickets, statusGroups, categoryGroups, urgencyGroups, evaluation, accounts, evaluationRows, [databaseClock]] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        title: true, category: true, urgency: true, createdAt: true, closedAt: true, status: true,
        user: { select: { name: true } }, assignedStaff: { select: { name: true } },
      },
    }),
    prisma.ticket.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["category"], where, _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["urgency"], where, _count: { _all: true } }),
    prisma.evaluation.aggregate({ where: { ticket: where }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, specialty: true, createdAt: true, _count: { select: { ticketsCreated: true, ticketsAssigned: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.evaluation.findMany({ where: { ticket: where }, orderBy: { createdAt: "desc" }, select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { name: true } }, ticket: { select: { title: true, status: true } } } }),
    prisma.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP AS "now"`,
  ]);

  const total = tickets.length;
  const done = tickets.filter((ticket) => DONE_STATUSES.has(ticket.status)).length;
  const open = tickets.filter((ticket) => ticket.status === TicketStatus.OPEN).length;
  const completionRate = total ? Math.round((done / total) * 100) : 0;
  const completedDurations = tickets.filter((ticket) => ticket.closedAt).map((ticket) => (ticket.closedAt!.getTime() - ticket.createdAt.getTime()) / 3_600_000);
  const averageResolution = completedDurations.length ? completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length : null;
  const statusMap = new Map(statusGroups.map((group) => [group.status, group._count._all]));
  const categoryMap = new Map(categoryGroups.map((group) => [group.category, group._count._all]));
  const urgencyMap = new Map(urgencyGroups.map((group) => [group.urgency, group._count._all]));
  const staffAccounts = accounts.filter((account) => account.role === Role.STAFF);
  const userAccounts = accounts.filter((account) => account.role === Role.USER);
  const activeStaff = staffAccounts.filter((account) => account.isActive).length;
  const activeUsers = userAccounts.filter((account) => account.isActive).length;
  const staffWorkload = staffAccounts.reduce((sum, account) => sum + account._count.ticketsAssigned, 0);
  const userTicketCount = userAccounts.reduce((sum, account) => sum + account._count.ticketsCreated, 0);

  const trendMap = new Map<string, { date: Date; total: number; done: number }>();
  tickets.forEach((ticket) => {
    const key = dateKey(ticket.createdAt);
    const entry = trendMap.get(key) ?? { date: ticket.createdAt, total: 0, done: 0 };
    entry.total += 1;
    if (DONE_STATUSES.has(ticket.status)) entry.done += 1;
    trendMap.set(key, entry);
  });
  const trend = [...trendMap.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-10).map(([, value]) => value);
  const trendMax = Math.max(...trend.map((item) => item.total), 1);
  const activeFilters = [from || to, selectedCategory, selectedUrgency].filter(Boolean).length;
  const exportParams = new URLSearchParams({ reportType });
  if (filters.from) exportParams.set("from", filters.from);
  if (filters.to) exportParams.set("to", filters.to);
  if (selectedCategory) exportParams.set("category", selectedCategory);
  if (selectedUrgency) exportParams.set("urgency", selectedUrgency);

  return (
    <main className="admin-tool-page report-page">
      <header className="report-heading">
        <div><span>ANALYTICS & REPORTS</span><h1>รายงานระบบ Helpdesk</h1><p>วิเคราะห์ปริมาณงาน ประสิทธิภาพการแก้ไข และคุณภาพบริการจากข้อมูลจริงในระบบ</p></div>
        <Link href="/admin">← กลับหน้าภาพรวม</Link>
      </header>

      <section className="report-type-bar">
        <div><span>รายงานที่กำลังแสดง</span><strong>{REPORT_TYPES[reportType].label}</strong><small>{REPORT_TYPES[reportType].description}</small></div>
        <Link className="report-export-button" href={`/api/admin/reports/pdf?${exportParams.toString()}`}>ดาวน์โหลด PDF <span>↓</span></Link>
      </section>

      <form className="report-filter">
        <div className="report-filter-title"><span>⌕</span><div><strong>ตัวกรองรายงาน</strong><small>{activeFilters ? `ใช้งาน ${activeFilters} ตัวกรอง` : "แสดงข้อมูลทั้งหมด"}</small></div></div>
        <label>ประเภทรายงาน<select name="reportType" defaultValue={reportType}>{Object.entries(REPORT_TYPES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
        <label>ตั้งแต่วันที่<input type="date" name="from" defaultValue={filters.from ?? ""} /></label>
        <label>ถึงวันที่<input type="date" name="to" defaultValue={filters.to ?? ""} /></label>
        <label>หมวดหมู่<select name="category" defaultValue={selectedCategory ?? ""}><option value="">ทุกหมวดหมู่</option>{Object.entries(CATEGORY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>ความเร่งด่วน<select name="urgency" defaultValue={selectedUrgency ?? ""}><option value="">ทุกระดับ</option>{Object.entries(URGENCY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="submit">แสดงผล</button>
        {activeFilters > 0 && <Link href="/admin/reports">ล้างตัวกรอง</Link>}
      </form>

      <section className="report-summary" id="summary">
        <article><span className="report-stat-icon purple">▦</span><div><small>คำร้องทั้งหมด</small><strong>{total.toLocaleString("th-TH")}</strong><p>ตามเงื่อนไขที่เลือก</p></div></article>
        <article><span className="report-stat-icon amber">!</span><div><small>รอมอบหมาย</small><strong>{open.toLocaleString("th-TH")}</strong><p>{total ? `${Math.round(open / total * 100)}% ของคำร้อง` : "ไม่มีข้อมูล"}</p></div></article>
        <article><span className="report-stat-icon green">✓</span><div><small>อัตราสำเร็จ</small><strong>{completionRate}%</strong><p>{done.toLocaleString("th-TH")} รายการสำเร็จแล้ว</p></div></article>
        <article><span className="report-stat-icon blue">◷</span><div><small>เวลาแก้ไขเฉลี่ย</small><strong>{formatAverageDuration(averageResolution)}</strong><p>เฉพาะเคสที่ปิดแล้ว</p></div></article>
        <article><span className="report-stat-icon pink">★</span><div><small>ความพึงพอใจ</small><strong>{evaluation._avg.rating?.toFixed(1) ?? "—"}<i> / 5</i></strong><p>จาก {evaluation._count._all.toLocaleString("th-TH")} ผลประเมิน</p></div></article>
      </section>

      {reportType === "overview" && <section className="report-panel report-trend" id="trend">
        <div className="report-section-heading"><div><span>VOLUME TREND</span><h2>แนวโน้มคำร้องที่สร้าง</h2><p>แสดงสูงสุด 10 วันที่มีข้อมูลล่าสุดตามช่วงเวลาที่เลือก</p></div><div className="report-legend"><span><i className="legend-total" />คำร้องใหม่</span><span><i className="legend-done" />ดำเนินการสำเร็จ</span></div></div>
        {trend.length === 0 ? <div className="report-empty">ไม่พบข้อมูลในช่วงเวลาที่เลือก</div> : <div className="trend-chart">{trend.map((item) => <div key={dateKey(item.date)} className="trend-column"><div className="trend-value">{item.total}</div><div className="trend-bars"><i className="trend-total" style={{ height: `${Math.max(8, item.total / trendMax * 100)}%` }} /><i className="trend-done" style={{ height: `${item.done ? Math.max(6, item.done / trendMax * 100) : 0}%` }} /></div><span>{shortDate(item.date)}</span></div>)}</div>}
      </section>}

      {reportType === "overview" && <><div className="report-distribution-grid overview-distributions"><section className="report-panel"><div className="report-section-heading"><div><h2>สถานะคำร้อง</h2></div></div><div className="report-metric-list">{STATUS_ORDER.map((status) => { const count = statusMap.get(status) ?? 0; return <div key={status}><div><span className={`report-dot status-${status.toLowerCase()}`} /><strong>{STATUS[status]}</strong><b>{count}</b></div><i><b className={`status-${status.toLowerCase()}`} style={{ width: `${total ? count / total * 100 : 0}%` }} /></i><small>{total ? Math.round(count / total * 100) : 0}%</small></div>})}</div></section><section className="report-panel"><div className="report-section-heading"><div><h2>คำร้องตามหมวดหมู่</h2></div></div><div className="report-metric-list">{Object.entries(CATEGORY).map(([category,label]) => { const count=categoryMap.get(category as Category)??0; return <div key={category}><div><span className="category-chip">{category.slice(0,2)}</span><strong>{label}</strong><b>{count}</b></div><i><b style={{width:`${total?count/total*100:0}%`}} /></i><small>{total?Math.round(count/total*100):0}%</small></div>})}</div></section><section className="report-panel"><div className="report-section-heading"><div><h2>คำร้องตามความเร่งด่วน</h2></div></div><div className="urgency-report">{URGENCY_ORDER.map((urgency)=>{const count=urgencyMap.get(urgency)??0;return <div key={urgency} className={`urgency-${urgency.toLowerCase()}`}><span>{URGENCY[urgency]}</span><strong>{count}</strong><small>{total?Math.round(count/total*100):0}%</small></div>})}</div></section></div><div className="dfd-overview-grid"><section className="report-panel report-mini-summary"><div className="report-section-heading"><div><h2>ผู้ใช้และเจ้าหน้าที่</h2></div></div><div><article><small>ผู้ใช้ที่ใช้งาน</small><strong>{activeUsers}</strong></article><article><small>เจ้าหน้าที่ที่ใช้งาน</small><strong>{activeStaff}</strong></article><article><small>งานที่รับผิดชอบ</small><strong>{staffWorkload}</strong></article></div></section><section className="report-panel"><div className="report-section-heading"><div><h2>ผลแบบประเมิน</h2></div></div><div className="evaluation-score-grid">{[5,4,3,2,1].map((rating)=>{const count=evaluationRows.filter((row)=>row.rating===rating).length;return <div key={rating}><strong>{rating} ดาว</strong><span>{count} รายการ</span><i><b style={{width:`${evaluationRows.length?count/evaluationRows.length*100:0}%`}} /></i></div>})}</div></section></div></>}

      {reportType === "tickets" && <div className="report-distribution-grid" id="distribution"><section className="report-panel"><div className="report-section-heading"><div><h2>คำร้องตามสถานะ</h2></div></div><div className="report-metric-list">{STATUS_ORDER.map((status) => { const count=statusMap.get(status)??0;return <div key={status}><div><span className={`report-dot status-${status.toLowerCase()}`} /><strong>{STATUS[status]}</strong><b>{count}</b></div><i><b className={`status-${status.toLowerCase()}`} style={{width:`${total?count/total*100:0}%`}} /></i><small>{total?Math.round(count/total*100):0}%</small></div>})}</div></section><section className="report-panel"><div className="report-section-heading"><div><h2>คำร้องตามหมวดหมู่</h2></div></div><div className="report-metric-list category-metrics">{Object.entries(CATEGORY).map(([category, label]) => { const count = categoryMap.get(category as Category) ?? 0; return <div key={category}><div><span className="category-chip">{category.slice(0, 2)}</span><strong>{label}</strong><b>{count.toLocaleString("th-TH")}</b></div><i><b style={{ width: `${total ? count / total * 100 : 0}%` }} /></i><small>{total ? Math.round(count / total * 100) : 0}%</small></div>; })}</div></section><section className="report-panel"><div className="report-section-heading"><div><h2>คำร้องตามความเร่งด่วน</h2></div></div><div className="urgency-report">{URGENCY_ORDER.map((urgency) => { const count = urgencyMap.get(urgency) ?? 0; return <div key={urgency} className={`urgency-${urgency.toLowerCase()}`}><span>{URGENCY[urgency]}</span><strong>{count.toLocaleString("th-TH")}</strong><small>{total ? Math.round(count / total * 100) : 0}%</small></div>; })}</div></section></div>}

      {reportType === "staff" && <section className="report-panel staff-performance"><div className="report-section-heading"><div><h2>รายงานเจ้าหน้าที่</h2><p>สรุปข้อมูลเจ้าหน้าที่ก่อนแสดงรายละเอียดบัญชีและภาระงาน</p></div></div><div className="report-local-summary"><article><small>เจ้าหน้าที่ทั้งหมด</small><strong>{staffAccounts.length}</strong></article><article><small>กำลังใช้งาน</small><strong>{activeStaff}</strong></article><article><small>งานที่รับผิดชอบทั้งหมด</small><strong>{staffWorkload}</strong></article></div><div className="staff-table-wrap"><table><thead><tr><th>เจ้าหน้าที่</th><th>ความเชี่ยวชาญ</th><th>สถานะ</th><th>งานที่รับผิดชอบ</th></tr></thead><tbody>{staffAccounts.map((account) => <tr key={account.id}><td><strong>{account.name}</strong></td><td>{account.specialty ? CATEGORY[account.specialty] : "ไม่ระบุ"}</td><td>{account.isActive ? "ใช้งาน" : "ระงับ"}</td><td>{account._count.ticketsAssigned}</td></tr>)}</tbody></table></div></section>}

      {reportType === "users" && <section className="report-panel staff-performance"><div className="report-section-heading"><div><h2>รายงานผู้ใช้</h2><p>สรุปข้อมูลผู้ใช้ก่อนแสดงรายละเอียดบัญชีและคำร้องที่แจ้ง</p></div></div><div className="report-local-summary"><article><small>ผู้ใช้ทั้งหมด</small><strong>{userAccounts.length}</strong></article><article><small>กำลังใช้งาน</small><strong>{activeUsers}</strong></article><article><small>คำร้องที่แจ้งทั้งหมด</small><strong>{userTicketCount}</strong></article></div><div className="staff-table-wrap"><table><thead><tr><th>ผู้ใช้</th><th>อีเมล</th><th>สถานะ</th><th>วันที่สร้างบัญชี</th><th>คำร้องที่แจ้ง</th></tr></thead><tbody>{userAccounts.map((account) => <tr key={account.id}><td><strong>{account.name}</strong></td><td>{account.email}</td><td>{account.isActive ? "ใช้งาน" : "ระงับ"}</td><td>{shortDate(account.createdAt)}</td><td>{account._count.ticketsCreated}</td></tr>)}</tbody></table></div></section>}

      {reportType === "evaluation" && <section className="report-panel evaluation-report"><div className="report-section-heading"><div><h2>ตารางผลแบบประเมิน</h2><p>คะแนนและความคิดเห็นที่ผู้ใช้ส่งหลังการให้บริการ</p></div></div><div className="evaluation-score-grid">{[5,4,3,2,1].map((rating) => { const count = evaluationRows.filter((row) => row.rating === rating).length; return <div key={rating}><strong>{rating} ดาว</strong><span>{count} รายการ</span><i><b style={{ width: `${evaluationRows.length ? count / evaluationRows.length * 100 : 0}%` }} /></i></div>})}</div><div className="staff-table-wrap"><table><thead><tr><th>วันที่ประเมิน</th><th>ผู้ประเมิน</th><th>คำร้อง</th><th>สถานะ</th><th>คะแนน</th><th>ความคิดเห็น</th></tr></thead><tbody>{evaluationRows.map((row) => <tr key={row.id}><td>{shortDate(row.createdAt)}</td><td>{row.user.name}</td><td>{row.ticket.title || "ไม่มีหัวข้อ"}</td><td>{STATUS[row.ticket.status]}</td><td><strong>{row.rating} / 5</strong></td><td>{row.comment || "ไม่มีความคิดเห็น"}</td></tr>)}</tbody></table></div></section>}

      {( reportType === "tickets") && <section className="report-panel report-detail-table">
        <div className="report-section-heading"><div><span>DETAIL RECORDS</span><h2>ตารางรายละเอียดคำร้อง</h2><p>ข้อมูลคำร้องทั้งหมด {total.toLocaleString("th-TH")} รายการตามตัวกรองที่เลือก</p></div></div>
        {tickets.length === 0 ? <div className="report-empty">ไม่พบข้อมูลคำร้องตามเงื่อนไขที่เลือก</div> : <div className="report-records-wrap"><table><thead><tr><th>วันที่แจ้ง</th><th>รายละเอียดคำร้อง</th><th>หมวดหมู่</th><th>ความเร่งด่วน</th><th>สถานะ</th><th>เวลาแก้ไข</th><th>ผู้รับผิดชอบ</th></tr></thead><tbody>{tickets.map((ticket, index) => { const elapsed=(ticket.closedAt?.getTime()??databaseClock.now.getTime())-ticket.createdAt.getTime(); return <tr key={`${ticket.createdAt.toISOString()}-${index}`}><td>{shortDate(ticket.createdAt)}</td><td><strong>{ticket.title || "ไม่มีหัวข้อ"}</strong><small>แจ้งโดย {ticket.user.name}</small></td><td>{ticket.category ? CATEGORY[ticket.category] : "ไม่ระบุ"}</td><td><span className={`table-urgency urgency-${ticket.urgency?.toLowerCase() ?? "none"}`}>{ticket.urgency ? URGENCY[ticket.urgency] : "ไม่ระบุ"}</span></td><td><span className={`table-status status-${ticket.status.toLowerCase()}`}>{STATUS[ticket.status]}</span></td><td><strong>{formatDetailedDuration(elapsed)}</strong><small>{ticket.closedAt?"เสร็จสิ้น":"กำลังนับเวลา"}</small></td><td>{ticket.assignedStaff?.name || "ยังไม่มอบหมาย"}</td></tr>})}</tbody></table></div>}
      </section>}
    </main>
  );
}
