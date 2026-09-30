import PDFDocument from "pdfkit";
import path from "node:path";
import { Prisma, Role, TicketStatus, Urgency, type Category } from "@prisma/client";
import { auth } from "@/auth";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";
import { formatDetailedDuration } from "@/lib/report-duration";

export const runtime = "nodejs";

const CATEGORY: Record<Category, string> = { NETWORK: "เครือข่าย", HARDWARE: "ฮาร์ดแวร์", SOFTWARE: "ซอฟต์แวร์", ACCOUNT: "บัญชีผู้ใช้" };
const STATUS: Record<TicketStatus, string> = { OPEN: "รอมอบหมาย", ASSIGNED: "มอบหมายแล้ว", IN_PROGRESS: "กำลังดำเนินการ", RESOLVED: "แก้ไขแล้ว", CLOSED: "ปิดเคส" };
const URGENCY: Record<Urgency, string> = { HIGH: "สูง", MEDIUM: "ปานกลาง", LOW: "ต่ำ" };
const STATUS_ORDER = [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED];
const URGENCY_ORDER = [Urgency.HIGH, Urgency.MEDIUM, Urgency.LOW];
const DONE_STATUSES = new Set<TicketStatus>([TicketStatus.RESOLVED, TicketStatus.CLOSED]);
const REPORT_TYPES = ["overview", "tickets", "staff", "users", "evaluation"] as const;
type ReportType = typeof REPORT_TYPES[number];

const REPORT_TITLE: Record<ReportType, string> = {
  overview: "รายงานภาพรวมระบบ",
  tickets: "รายงานข้อมูลคำร้อง",
  staff: "รายงานเจ้าหน้าที่",
  users: "รายงานผู้ใช้",
  evaluation: "รายงานผลแบบประเมิน",
};

const COLORS = { purple: "#6750A4", pale: "#F1EAFD", ink: "#29242E", muted: "#746D79", line: "#E2D9E6", green: "#3DA46A", amber: "#D39A13", blue: "#4F82CA", gray: "#8B929D", red: "#B74747" };

function thaiNumber(value: number | string) {
  return String(value).replace(/\d/g, (digit) => "๐๑๒๓๔๕๖๗๘๙"[Number(digit)]);
}

function thaiDate(date: Date) {
  return new Intl.DateTimeFormat("th-TH-u-nu-thai", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(date);
}

function thaiShortDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Bangkok" }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const months = ["มค", "กพ", "มีค", "เมย", "พค", "มิย", "กค", "สค", "กย", "ตค", "พย", "ธค"];
  const buddhistYear = String(Number(value.year) + 543).slice(-2);
  return `${thaiNumber(value.day)} ${months[Number(value.month) - 1]} ${thaiNumber(buddhistYear)}`;
}

function thaiDuration(createdAt: Date, endedAt: Date) {
  return thaiNumber(formatDetailedDuration(endedAt.getTime() - createdAt.getTime()));
}

function parseFilters(url: URL) {
  const fromValue = url.searchParams.get("from");
  const toValue = url.searchParams.get("to");
  const categoryValue = url.searchParams.get("category");
  const urgencyValue = url.searchParams.get("urgency");
  const typeValue = url.searchParams.get("reportType");
  const from = fromValue && /^\d{4}-\d{2}-\d{2}$/.test(fromValue) ? new Date(`${fromValue}T00:00:00+07:00`) : null;
  const to = toValue && /^\d{4}-\d{2}-\d{2}$/.test(toValue) ? new Date(`${toValue}T23:59:59+07:00`) : null;
  const category = categoryValue && Object.keys(CATEGORY).includes(categoryValue) ? categoryValue as Category : null;
  const urgency = urgencyValue && Object.values(Urgency).includes(urgencyValue as Urgency) ? urgencyValue as Urgency : null;
  const reportType = typeValue && REPORT_TYPES.includes(typeValue as ReportType) ? typeValue as ReportType : "overview";
  const where: Prisma.TicketWhereInput = {
    ...(category ? { category } : {}),
    ...(urgency ? { urgency } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
  return { from, to, category, urgency, reportType, where };
}

function createPdfBuffer(build: (doc: PDFKit.PDFDocument) => void) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: 42, bufferPages: true, info: { Title: "Smart Helpdesk Report", Author: "Smart Helpdesk" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      doc.page.margins.bottom = 0;
      doc.font("Thai").fontSize(8).fillColor("#8A828F").text(`สร้างโดยระบบช่วยเหลือ   หน้า ${thaiNumber(index + 1)} จาก ${thaiNumber(range.count)}`, 42, 815, { width: 511, align: "center", lineBreak: false });
    }
    doc.end();
  });
}

function registerFonts(doc: PDFKit.PDFDocument) {
  const fontPath = path.join(process.cwd(), "assets", "fonts", "NotoSansThai-Variable.ttf");
  doc.registerFont("Thai", fontPath);
  doc.registerFont("ThaiBold", fontPath);
}

function addPageHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.purple).text("SMART HELPDESK  /  ANALYTICS REPORT", 42, 36);
  doc.font("ThaiBold").fontSize(22).fillColor(COLORS.ink).text(title, 42, 58, { width: 511 });
  if (subtitle) doc.font("Thai").fontSize(10).fillColor(COLORS.muted).text(subtitle, 42, 90, { width: 511 });
  doc.moveTo(42, subtitle ? 113 : 101).lineTo(553, subtitle ? 113 : 101).strokeColor(COLORS.line).stroke();
  doc.y = subtitle ? 128 : 116;
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number, title: string) {
  if (doc.y + height <= 785) return;
  doc.addPage();
  addPageHeader(doc, title, "ส่วนต่อของรายงาน");
}

function addFilterSummary(doc: PDFKit.PDFDocument, filters: ReturnType<typeof parseFilters>) {
  const parts = [
    filters.from || filters.to ? `ช่วงวันที่ ${filters.from ? thaiDate(filters.from) : "เริ่มต้น"} ถึง ${filters.to ? thaiDate(filters.to) : "ปัจจุบัน"}` : "ช่วงเวลาทั้งหมด",
    filters.category ? `หมวดหมู่ ${CATEGORY[filters.category]}` : "ทุกหมวดหมู่",
    filters.urgency ? `ความเร่งด่วน ${URGENCY[filters.urgency]}` : "ทุกระดับความเร่งด่วน",
  ];
  const top = doc.y;
  doc.roundedRect(42, top, 511, 32, 8).fill("#F8F4FA");
  doc.font("Thai").fontSize(9).fillColor("#5F5666").text(parts.join("   "), 53, top + 10, { width: 490, lineBreak: false });
  doc.y = top + 46;
}

function addSectionTitle(doc: PDFKit.PDFDocument, label: string, title: string) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.purple).text(label.toUpperCase(), 42, doc.y);
  doc.font("ThaiBold").fontSize(15).fillColor(COLORS.ink).text(title, 42, doc.y + 5);
  doc.y += 32;
}

function addKpis(doc: PDFKit.PDFDocument, items: Array<{ label: string; value: string; note: string }>) {
  const gap = 8;
  const width = (511 - gap * (items.length - 1)) / items.length;
  const top = doc.y;
  items.forEach((item, index) => {
    const x = 42 + index * (width + gap);
    doc.roundedRect(x, top, width, 78, 9).fillAndStroke("#FFFFFF", COLORS.line);
    doc.font("Thai").fontSize(8).fillColor(COLORS.muted).text(item.label, x + 10, top + 11, { width: width - 20 });
    doc.font("ThaiBold").fontSize(19).fillColor(COLORS.ink).text(item.value, x + 10, top + 29, { width: width - 20 });
    doc.font("Thai").fontSize(7.5).fillColor("#8A828F").text(item.note, x + 10, top + 56, { width: width - 20 });
  });
  doc.y = top + 94;
}

function addBars(doc: PDFKit.PDFDocument, rows: Array<{ label: string; count: number; color: string }>, total: number) {
  rows.forEach((row) => {
    ensureSpace(doc, 43, "รายงานระบบ Helpdesk");
    const y = doc.y;
    const percent = total ? Math.round(row.count / total * 100) : 0;
    doc.font("Thai").fontSize(10).fillColor(COLORS.ink).text(row.label, 42, y, { width: 280 });
    doc.font("ThaiBold").fontSize(10).fillColor(COLORS.ink).text(thaiNumber(row.count), 410, y, { width: 48, align: "right" });
    doc.font("Thai").fontSize(9).fillColor(COLORS.muted).text(`${thaiNumber(percent)} เปอร์เซ็นต์`, 466, y, { width: 87, align: "right" });
    doc.roundedRect(42, y + 19, 511, 7, 3.5).fill("#EEE9F0");
    if (percent > 0) doc.roundedRect(42, y + 19, Math.max(6, 511 * percent / 100), 7, 3.5).fill(row.color);
    doc.y = y + 39;
  });
}

function addTicketSummaryCards(
  doc: PDFKit.PDFDocument,
  cards: Array<{ title: string; rows: Array<{ label: string; count: number; color: string }> }>,
  total: number,
) {
  ensureSpace(doc, 190, REPORT_TITLE.tickets);
  addSectionTitle(doc, "TICKET SUMMARY", "ภาพรวมข้อมูลคำร้อง");
  const gap = 8;
  const cardWidth = (511 - gap * 2) / 3;
  const cardHeight = 160;
  const top = doc.y;

  cards.forEach((card, cardIndex) => {
    const x = 42 + cardIndex * (cardWidth + gap);
    doc.roundedRect(x, top, cardWidth, cardHeight, 9).fillAndStroke("#FFFFFF", COLORS.line);
    doc.font("ThaiBold").fontSize(10).fillColor(COLORS.ink).text(card.title, x + 10, top + 11, { width: cardWidth - 20, lineBreak: false });

    card.rows.forEach((row, rowIndex) => {
      const rowTop = top + 34 + rowIndex * 24;
      const percent = total ? Math.round(row.count / total * 100) : 0;
      doc.font("Thai").fontSize(7.3).fillColor("#5F5666").text(row.label, x + 10, rowTop, { width: cardWidth - 58, lineBreak: false, ellipsis: true });
      doc.font("ThaiBold").fontSize(7.3).fillColor(COLORS.ink).text(thaiNumber(row.count), x + cardWidth - 43, rowTop, { width: 33, align: "right", lineBreak: false });
      doc.roundedRect(x + 10, rowTop + 12, cardWidth - 44, 4, 2).fill("#EEE9F0");
      if (percent > 0) doc.roundedRect(x + 10, rowTop + 12, Math.max(4, (cardWidth - 44) * percent / 100), 4, 2).fill(row.color);
      doc.font("Thai").fontSize(6.2).fillColor(COLORS.muted).text(`${thaiNumber(percent)}%`, x + cardWidth - 31, rowTop + 10, { width: 21, align: "right", lineBreak: false });
    });
  });

  doc.y = top + cardHeight + 18;
}

type TicketTableRow = {
  title: string | null;
  category: Category | null;
  urgency: Urgency | null;
  status: TicketStatus;
  createdAt: Date;
  closedAt: Date | null;
  assignedStaff: { name: string } | null;
};

function addTicketTable(doc: PDFKit.PDFDocument, tickets: TicketTableRow[], reportTitle: string, generatedAt: Date) {
  ensureSpace(doc, 95, reportTitle);
  addSectionTitle(doc, "DETAIL RECORDS", "ตารางรายละเอียดคำร้อง");
  const widths = [56, 137, 65, 56, 67, 67, 63];
  const columns = widths.reduce<number[]>((items, width, index) => [...items, index === 0 ? 42 : items[index - 1] + widths[index - 1]], []);

  const addHeader = () => {
    const top = doc.y;
    doc.rect(42, top, 511, 27).fill("#F1EAFD");
    ["วันที่", "รายละเอียดคำร้อง", "หมวดหมู่", "เร่งด่วน", "สถานะ", "เวลาแก้ไข", "ผู้รับผิดชอบ"].forEach((label, index) => {
      doc.font("ThaiBold").fontSize(7.5).fillColor("#4F378A").text(label, columns[index] + 5, top + 9, { width: widths[index] - 10, lineBreak: false });
    });
    doc.y = top + 30;
  };

  addHeader();
  if (tickets.length === 0) {
    doc.font("Thai").fontSize(10).fillColor(COLORS.muted).text("ไม่พบข้อมูลคำร้องตามเงื่อนไขที่เลือก", 42, doc.y + 18, { width: 511, align: "center" });
    doc.y += 55;
    return;
  }

  tickets.forEach((ticket) => {
    if (doc.y + 39 > 785) {
      doc.addPage();
      addPageHeader(doc, reportTitle, "ตารางรายละเอียดคำร้อง ส่วนต่อ");
      addHeader();
    }
    const y = doc.y;
    const values = [
      thaiShortDate(ticket.createdAt),
      ticket.title || "ไม่มีหัวข้อ",
      ticket.category ? CATEGORY[ticket.category] : "ไม่ระบุ",
      ticket.urgency ? URGENCY[ticket.urgency] : "ไม่ระบุ",
      STATUS[ticket.status],
      thaiDuration(ticket.createdAt, ticket.closedAt ?? generatedAt),
      ticket.assignedStaff?.name || "ยังไม่มอบหมาย",
    ];
    values.forEach((value, index) => {
      const font = /[\u0E00-\u0E7F]/.test(value) ? (index === 1 ? "ThaiBold" : "Thai") : (index === 1 ? "Helvetica-Bold" : "Helvetica");
      doc.font(font).fontSize(index === 1 ? 8 : 7.5).fillColor(index === 1 ? COLORS.ink : "#5F5666").text(value, columns[index] + 5, y + 8, { width: widths[index] - 10, height: 24, ellipsis: true, lineBreak: true });
    });
    doc.moveTo(42, y + 35).lineTo(553, y + 35).strokeColor("#EEE8F0").stroke();
    doc.y = y + 38;
  });
}

function pdfFont(value: string, bold = false) {
  return /[\u0E00-\u0E7F]/.test(value) ? (bold ? "ThaiBold" : "Thai") : (bold ? "Helvetica-Bold" : "Helvetica");
}

function addDataTable(doc: PDFKit.PDFDocument, title: string, headers: string[], widths: number[], rows: string[][]) {
  ensureSpace(doc, 90, title);
  addSectionTitle(doc, "DETAIL RECORDS", title);
  const positions = widths.reduce<number[]>((items, width, index) => [...items, index === 0 ? 42 : items[index - 1] + widths[index - 1]], []);
  const header = () => {
    const top = doc.y;
    doc.rect(42, top, 511, 27).fill("#F1EAFD");
    headers.forEach((label, index) => doc.font("ThaiBold").fontSize(7.3).fillColor("#4F378A").text(label, positions[index] + 5, top + 9, { width: widths[index] - 10, lineBreak: false }));
    doc.y = top + 30;
  };
  header();
  rows.forEach((row) => {
    if (doc.y + 39 > 785) { doc.addPage(); addPageHeader(doc, title, "ตารางข้อมูล ส่วนต่อ"); header(); }
    const y = doc.y;
    row.forEach((value, index) => doc.font(pdfFont(value, index === 0)).fontSize(index === 0 ? 8 : 7.4).fillColor(index === 0 ? COLORS.ink : "#5F5666").text(value, positions[index] + 5, y + 8, { width: widths[index] - 10, height: 24, ellipsis: true }));
    doc.moveTo(42, y + 35).lineTo(553, y + 35).strokeColor("#EEE8F0").stroke();
    doc.y = y + 38;
  });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if ((await getCurrentUserRole(session.user.id)) !== Role.ADMIN) return new Response("Forbidden", { status: 403 });

  const filters = parseFilters(new URL(request.url));
  const [tickets, evaluation, accounts, evaluationRows, [databaseClock]] = await Promise.all([
    prisma.ticket.findMany({
      where: filters.where,
      orderBy: { createdAt: "desc" },
      select: { title: true, status: true, category: true, urgency: true, createdAt: true, closedAt: true, assignedStaff: { select: { name: true } } },
    }),
    prisma.evaluation.aggregate({ where: { ticket: filters.where }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.user.findMany({ select: { name: true, email: true, role: true, isActive: true, specialty: true, createdAt: true, _count: { select: { ticketsCreated: true, ticketsAssigned: true } } }, orderBy: { name: "asc" } }),
    prisma.evaluation.findMany({ where: { ticket: filters.where }, orderBy: { createdAt: "desc" }, select: { rating: true, comment: true, createdAt: true, user: { select: { name: true } }, ticket: { select: { title: true, status: true } } } }),
    prisma.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP AS "now"`,
  ]);

  const total = tickets.length;
  const done = tickets.filter((ticket) => DONE_STATUSES.has(ticket.status)).length;
  const durations = tickets.filter((ticket) => ticket.closedAt).map((ticket) => (ticket.closedAt!.getTime() - ticket.createdAt.getTime()) / 3_600_000);
  const averageHours = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null;
  const completionRate = total ? Math.round(done / total * 100) : 0;
  const staffAccounts = accounts.filter((account) => account.role === Role.STAFF);
  const userAccounts = accounts.filter((account) => account.role === Role.USER);
  const activeStaff = staffAccounts.filter((account) => account.isActive).length;
  const activeUsers = userAccounts.filter((account) => account.isActive).length;
  const staffWorkload = staffAccounts.reduce((sum, account) => sum + account._count.ticketsAssigned, 0);
  const userTicketCount = userAccounts.reduce((sum, account) => sum + account._count.ticketsCreated, 0);

  const pdf = await createPdfBuffer((doc) => {
    registerFonts(doc);
    addPageHeader(doc, REPORT_TITLE[filters.reportType], `จัดทำเมื่อ ${thaiDate(new Date())}`);
    addFilterSummary(doc, filters);

    if (filters.reportType === "overview") {
      addSectionTitle(doc, "EXECUTIVE SUMMARY", "สรุปภาพรวมการให้บริการ");
      const summaryTop = doc.y;
      doc.roundedRect(42, summaryTop, 511, 82, 10).fill("#F8F4FA");
      doc.font("Thai").fontSize(10).fillColor(COLORS.ink).text(`ระบบมีคำร้องทั้งหมด ${thaiNumber(total)} รายการ ดำเนินการสำเร็จแล้ว ${thaiNumber(done)} รายการ คิดเป็น ${thaiNumber(completionRate)} เปอร์เซ็นต์`, 56, summaryTop + 15, { width: 480, lineGap: 4 });
      doc.text(`เวลาแก้ไขเฉลี่ย ${averageHours === null ? "ไม่มีข้อมูล" : averageHours < 24 ? `${thaiNumber(Math.max(1, Math.round(averageHours)))} ชั่วโมง` : `${thaiNumber((averageHours / 24).toFixed(1))} วัน`} และมีผลประเมินบริการ ${thaiNumber(evaluation._count._all)} รายการ`, 56, summaryTop + 45, { width: 480 });
      doc.y = summaryTop + 102;
      addSectionTitle(doc, "STATUS SNAPSHOT", "ภาพรวมสถานะคำร้อง");
      addBars(doc, STATUS_ORDER.map((status, index) => ({ label: STATUS[status], count: tickets.filter((ticket) => ticket.status === status).length, color: [COLORS.amber, COLORS.blue, COLORS.purple, COLORS.green, COLORS.gray][index] })), total);
      ensureSpace(doc, 90, REPORT_TITLE.overview);
      addSectionTitle(doc, "CATEGORY DISTRIBUTION", "คำร้องตามหมวดหมู่");
      addBars(doc, Object.entries(CATEGORY).map(([category, label]) => ({ label, count: tickets.filter((ticket) => ticket.category === category).length, color: COLORS.purple })), total);
      ensureSpace(doc, 90, REPORT_TITLE.overview);
      addSectionTitle(doc, "URGENCY DISTRIBUTION", "คำร้องตามความเร่งด่วน");
      addBars(doc, URGENCY_ORDER.map((urgency, index) => ({ label: URGENCY[urgency], count: tickets.filter((ticket) => ticket.urgency === urgency).length, color: [COLORS.red, COLORS.amber, COLORS.green][index] })), total);
      ensureSpace(doc, 135, REPORT_TITLE.overview);
      addSectionTitle(doc, "ACCOUNT SUMMARY", "ภาพรวมผู้ใช้และเจ้าหน้าที่");
      addKpis(doc, [
        { label: "ผู้ใช้ที่ใช้งาน", value: thaiNumber(activeUsers), note: `จากผู้ใช้ ${thaiNumber(userAccounts.length)} บัญชี` },
        { label: "เจ้าหน้าที่ที่ใช้งาน", value: thaiNumber(activeStaff), note: `จากเจ้าหน้าที่ ${thaiNumber(staffAccounts.length)} บัญชี` },
        { label: "งานที่รับผิดชอบ", value: thaiNumber(staffWorkload), note: "รวมภาระงานเจ้าหน้าที่" },
      ]);
      ensureSpace(doc, 90, REPORT_TITLE.overview);
      addSectionTitle(doc, "EVALUATION SUMMARY", "ภาพรวมผลแบบประเมิน");
      addBars(doc, [5, 4, 3, 2, 1].map((rating) => ({ label: `${thaiNumber(rating)} ดาว`, count: evaluationRows.filter((row) => row.rating === rating).length, color: COLORS.purple })), evaluationRows.length);
    }

    if (filters.reportType === "tickets") {
      addTicketSummaryCards(doc, [
        { title: "คำร้องตามสถานะ", rows: STATUS_ORDER.map((status, index) => ({ label: STATUS[status], count: tickets.filter((ticket) => ticket.status === status).length, color: [COLORS.amber, COLORS.blue, COLORS.purple, COLORS.green, COLORS.gray][index] })) },
        { title: "คำร้องตามหมวดหมู่", rows: Object.entries(CATEGORY).map(([category, label]) => ({ label, count: tickets.filter((ticket) => ticket.category === category).length, color: COLORS.purple })) },
        { title: "คำร้องตามความเร่งด่วน", rows: URGENCY_ORDER.map((urgency, index) => ({ label: URGENCY[urgency], count: tickets.filter((ticket) => ticket.urgency === urgency).length, color: [COLORS.red, COLORS.amber, COLORS.green][index] })) },
      ], total);
    }

    if (filters.reportType === "staff") {
      addKpis(doc, [
        { label: "เจ้าหน้าที่ทั้งหมด", value: thaiNumber(staffAccounts.length), note: "บัญชีเจ้าหน้าที่ในระบบ" },
        { label: "กำลังใช้งาน", value: thaiNumber(activeStaff), note: "บัญชีที่เปิดใช้งาน" },
        { label: "งานที่รับผิดชอบ", value: thaiNumber(staffWorkload), note: "รวมคำร้องที่ได้รับมอบหมาย" },
      ]);
      addDataTable(doc, "ตารางข้อมูลเจ้าหน้าที่", ["ชื่อ", "อีเมล", "ความเชี่ยวชาญ", "สถานะ", "งานรับผิดชอบ"], [105, 155, 90, 70, 91], staffAccounts.map((account) => [account.name, account.email, account.specialty ? CATEGORY[account.specialty] : "ไม่ระบุ", account.isActive ? "ใช้งาน" : "ระงับ", thaiNumber(account._count.ticketsAssigned)]));
    }

    if (filters.reportType === "users") {
      addKpis(doc, [
        { label: "ผู้ใช้ทั้งหมด", value: thaiNumber(userAccounts.length), note: "บัญชีผู้ใช้ในระบบ" },
        { label: "กำลังใช้งาน", value: thaiNumber(activeUsers), note: "บัญชีที่เปิดใช้งาน" },
        { label: "คำร้องที่แจ้ง", value: thaiNumber(userTicketCount), note: "รวมคำร้องจากผู้ใช้" },
      ]);
      addDataTable(doc, "ตารางข้อมูลผู้ใช้", ["ชื่อ", "อีเมล", "สถานะ", "สร้างบัญชี", "คำร้องที่แจ้ง"], [115, 165, 70, 85, 76], userAccounts.map((account) => [account.name, account.email, account.isActive ? "ใช้งาน" : "ระงับ", thaiShortDate(account.createdAt), thaiNumber(account._count.ticketsCreated)]));
    }

    if (filters.reportType === "evaluation") {
      addKpis(doc, [
        { label: "ผลประเมินทั้งหมด", value: thaiNumber(evaluation._count._all), note: "ตามเงื่อนไขที่เลือก" },
        { label: "คะแนนเฉลี่ย", value: evaluation._avg.rating ? `${thaiNumber(evaluation._avg.rating.toFixed(1))} / ${thaiNumber(5)}` : "ไม่มีข้อมูล", note: "คะแนนความพึงพอใจ" },
      ]);
      addSectionTitle(doc, "EVALUATION DISTRIBUTION", "สรุปคะแนนแบบประเมิน");
      addBars(doc, [5, 4, 3, 2, 1].map((rating) => ({ label: `${thaiNumber(rating)} ดาว`, count: evaluationRows.filter((row) => row.rating === rating).length, color: COLORS.purple })), evaluationRows.length);
      addDataTable(doc, "ตารางผลแบบประเมิน", ["วันที่ประเมิน", "ผู้ประเมิน", "คำร้อง", "สถานะ", "คะแนน", "ความคิดเห็น"], [62, 80, 128, 65, 54, 122], evaluationRows.map((row) => [thaiShortDate(row.createdAt), row.user.name, row.ticket.title || "ไม่มีหัวข้อ", STATUS[row.ticket.status], `${thaiNumber(row.rating)} ดาว`, row.comment || "ไม่มีความคิดเห็น"]));
    }

    if (["overview", "tickets"].includes(filters.reportType)) addTicketTable(doc, tickets, REPORT_TITLE[filters.reportType], databaseClock.now);
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="smart-helpdesk-${filters.reportType}-report.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
