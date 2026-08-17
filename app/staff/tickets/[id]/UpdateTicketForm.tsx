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
    <div className="staff-update-form">
      <label>สถานะ</label>
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as TicketStatus)}
        className="staff-status-select"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <label>
        วิธีแก้ไข
      </label>
      <textarea
        value={resolutionNote}
        onChange={(event) => setResolutionNote(event.target.value)}
        rows={3}
        className="staff-resolution-textarea"
        placeholder="อธิบายวิธีแก้ไขปัญหา..."
      />

      <div className="reply-actions">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="reply-submit"
        >
          {submitting ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
