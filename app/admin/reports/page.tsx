import { Role, TicketStatus, type Category } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";

const CATEGORY: Record<Category, string> = { NETWORK: "เครือข่าย", HARDWARE: "ฮาร์ดแวร์", SOFTWARE: "ซอฟต์แวร์", ACCOUNT: "บัญชีผู้ใช้" };
const STATUS: Record<TicketStatus, string> = { OPEN: "รอมอบหมาย", ASSIGNED: "มอบหมายแล้ว", IN_PROGRESS: "กำลังดำเนินการ", RESOLVED: "แก้ไขแล้ว", CLOSED: "ปิดเคส" };
const ACTIVE_STATUSES = new Set<TicketStatus>([TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS]);
const DONE_STATUSES = new Set<TicketStatus>([TicketStatus.RESOLVED, TicketStatus.CLOSED]);

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if ((await getCurrentUserRole(session.user.id)) !== Role.ADMIN) redirect("/chat");
  const filters = await searchParams;
  const from = filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)
    ? new Date(`${filters.from}T00:00:00+07:00`) : null;
  const to = filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)
    ? new Date(`${filters.to}T23:59:59+07:00`) : null;
  const selectedCategory = filters.category && Object.keys(CATEGORY).includes(filters.category)
    ? filters.category as Category : null;
  const where = {
    ...(selectedCategory ? { category: selectedCategory } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
  const [total, statusGroups, categoryGroups, evaluation, staff] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ["category"], where, _count: { _all: true } }),
    prisma.evaluation.aggregate({
      where: { ticket: where },
      _avg: { rating: true }, _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { role: Role.STAFF },
      select: { id: true, name: true, specialty: true, ticketsAssigned: { where, select: { status: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const closed = statusGroups.find((g) => g.status === TicketStatus.CLOSED)?._count._all ?? 0;
  return <main className="admin-tool-page report-page">
    <div className="tool-heading"><span>PERFORMANCE OVERVIEW</span><h1>รายงานระบบ Helpdesk</h1><p>สรุปข้อมูลคำร้อง ประสิทธิภาพการดำเนินงาน และความพึงพอใจจากข้อมูลจริง</p></div>
    <form className="report-filter">
      <label>ตั้งแต่วันที่<input type="date" name="from" defaultValue={filters.from ?? ""} /></label>
      <label>ถึงวันที่<input type="date" name="to" defaultValue={filters.to ?? ""} /></label>
      <label>หมวดหมู่<select name="category" defaultValue={selectedCategory ?? ""}><option value="">ทุกหมวดหมู่</option>{Object.entries(CATEGORY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button type="submit">แสดงรายงาน</button>
      <Link href="/admin/reports">ล้างตัวกรอง</Link>
    </form>
    <div className="report-stats">
      <article><small>คำร้องทั้งหมด</small><strong>{total}</strong></article>
      <article><small>ปิดเคสแล้ว</small><strong>{closed}</strong></article>
      <article><small>ผลประเมิน</small><strong>{evaluation._count._all}</strong></article>
      <article><small>คะแนนเฉลี่ย</small><strong>{evaluation._avg.rating?.toFixed(1) ?? "—"} <i>/ 5</i></strong></article>
    </div>
    <div className="report-grid">
      <section><h2>สถานะคำร้อง</h2><div className="metric-list">{statusGroups.map((g) => <div key={g.status}><span>{STATUS[g.status]}</span><b>{g._count._all}</b><i style={{ width: `${total ? g._count._all / total * 100 : 0}%` }} /></div>)}</div></section>
      <section><h2>คำร้องตามหมวดหมู่</h2><div className="metric-list">{categoryGroups.map((g) => <div key={g.category ?? "none"}><span>{g.category ? CATEGORY[g.category] : "ไม่ระบุ"}</span><b>{g._count._all}</b><i style={{ width: `${total ? g._count._all / total * 100 : 0}%` }} /></div>)}</div></section>
    </div>
    <section className="staff-report"><h2>ประสิทธิภาพเจ้าหน้าที่</h2><table><thead><tr><th>เจ้าหน้าที่</th><th>ความเชี่ยวชาญ</th><th>งานทั้งหมด</th><th>กำลังทำ</th><th>สำเร็จ/ปิดแล้ว</th></tr></thead><tbody>{staff.map((person) => {
      const active = person.ticketsAssigned.filter((t) => ACTIVE_STATUSES.has(t.status)).length;
      const done = person.ticketsAssigned.filter((t) => DONE_STATUSES.has(t.status)).length;
      return <tr key={person.id}><td><strong>{person.name}</strong></td><td>{person.specialty ? CATEGORY[person.specialty] : "—"}</td><td>{person.ticketsAssigned.length}</td><td>{active}</td><td>{done}</td></tr>;
    })}</tbody></table></section>
  </main>;
}
