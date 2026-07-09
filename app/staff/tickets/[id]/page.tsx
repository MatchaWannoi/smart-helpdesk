import { Role, TicketStatus, type Category, type Urgency } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChatBubble } from "@/components/chat/ChatBubble";
import type { ChatMessage } from "@/hooks/useChatMessages";
import { getCurrentUserRole } from "@/lib/current-user-role";
import { prisma } from "@/lib/prisma";
import { StaffReplyForm } from "./StaffReplyForm";
import { UpdateTicketForm } from "./UpdateTicketForm";

const STATUS_LABEL: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: "รอมอบหมาย",
  [TicketStatus.ASSIGNED]: "มอบหมายแล้ว",
  [TicketStatus.IN_PROGRESS]: "กำลังดำเนินการ",
  [TicketStatus.RESOLVED]: "แก้ไขแล้ว",
  [TicketStatus.CLOSED]: "ปิดเคส",
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

export default async function StaffTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = await getCurrentUserRole(session.user.id);

  if (role !== Role.STAFF) {
    redirect("/chat");
  }

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket || ticket.assignedStaffId !== session.user.id) {
    notFound();
  }

  const chatMessages: ChatMessage[] = ticket.messages.map((message) => ({
    id: message.id,
    senderId: message.senderId,
    senderType: message.senderType,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        href="/staff/tickets"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        กลับไปหน้ารายการ ticket
      </Link>

      <section className="mb-6 border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {ticket.title ?? "ไม่มีหัวข้อ"}
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              แจ้งโดย {ticket.user.name} ({ticket.user.email})
            </p>
          </div>
          <span className="shrink-0 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {STATUS_LABEL[ticket.status]}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-zinc-500">สร้างเมื่อ</dt>
          <dd>{formatDate(ticket.createdAt)}</dd>

          <dt className="text-zinc-500">หมวดหมู่</dt>
          <dd>{ticket.category ? CATEGORY_LABEL[ticket.category] : "ไม่ระบุ"}</dd>

          <dt className="text-zinc-500">ความเร่งด่วน</dt>
          <dd>{ticket.urgency ? URGENCY_LABEL[ticket.urgency] : "ไม่ระบุ"}</dd>
        </dl>

        <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <UpdateTicketForm
            ticketId={ticket.id}
            currentStatus={ticket.status}
            currentResolutionNote={ticket.resolutionNote}
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          ประวัติแชท
        </h2>
        {chatMessages.length === 0 ? (
          <p className="text-sm text-zinc-500">ยังไม่มีข้อความใน ticket นี้</p>
        ) : (
          <div className="flex flex-col gap-3">
            {chatMessages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </section>

      <StaffReplyForm ticketId={ticket.id} />
    </main>
  );
}
