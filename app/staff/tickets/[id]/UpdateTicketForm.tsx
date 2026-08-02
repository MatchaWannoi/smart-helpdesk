"use client";

import type { TicketStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "ASSIGNED", label: "มอบหมายแล้ว" },
  { value: "IN_PROGRESS", label: "กำลังดำเนินการ" },
  { value: "RESOLVED", label: "แก้ไขแล้ว" },
];

interface UpdateTicketFormProps {
  ticketId: string;
  currentStatus: TicketStatus;
  currentResolutionNote: string | null;
}

export function UpdateTicketForm({
  ticketId,
  currentStatus,
  currentResolutionNote,
}: UpdateTicketFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<TicketStatus>(currentStatus);
  const [resolutionNote, setResolutionNote] = useState(
    currentResolutionNote ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentStatus === "CLOSED") {
    return <p className="text-sm text-zinc-500">ผู้ใช้ยืนยันผลและปิดคำร้องนี้แล้ว</p>;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          resolutionNote: resolutionNote.trim() || null,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "อัปเดตไม่สำเร็จ");
      }

      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-zinc-500">สถานะ</label>
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as TicketStatus)}
        className="w-fit border border-zinc-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-zinc-700"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <label className="mt-2 text-xs font-medium text-zinc-500">
        วิธีแก้ไข
      </label>
      <textarea
        value={resolutionNote}
        onChange={(event) => setResolutionNote(event.target.value)}
        rows={3}
        className="border border-zinc-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-zinc-700"
        placeholder="อธิบายวิธีแก้ไขปัญหา..."
      />

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
