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

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Ticket ของฉัน
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            รายการเคสที่ระบบสร้างจากแชทเมื่อ AI ต้องส่งต่อเจ้าหน้าที่
          </p>
        </div>
        <Link
          href="/chat"
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          กลับไปแชท
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
          ยังไม่มี ticket เมื่อ AI ไม่มั่นใจในคำตอบ ระบบจะสร้าง ticket ให้โดยอัตโนมัติ
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/tickets/${ticket.id}`}
                className="block border border-zinc-200 px-4 py-3 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {ticket.title ?? "ไม่มีหัวข้อ"}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      สร้างเมื่อ {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[ticket.status]}`}
                  >
                    {STATUS_LABEL[ticket.status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
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
