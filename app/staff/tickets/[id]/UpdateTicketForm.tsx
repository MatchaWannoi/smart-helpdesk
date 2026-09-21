"use client";

import type { TicketStatus } from "@prisma/client";
import { useState } from "react";
import { PageTransitionPopup } from "@/components/feedback/PageTransitionPopup";
import { useConfirmDialog } from "@/components/feedback/ConfirmDialogProvider";
import { useRenderedOperation } from "@/hooks/useRenderedOperation";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "ASSIGNED", label: "มอบหมายแล้ว" },
  { value: "IN_PROGRESS", label: "กำลังดำเนินการ" },
  { value: "RESOLVED", label: "แก้ไขแล้ว" },
];

const STATUS_PROGRESS: Record<TicketStatus, number> = {
  OPEN: 0,
  ASSIGNED: 1,
  IN_PROGRESS: 2,
  RESOLVED: 3,
  CLOSED: 4,
};

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
  const [status, setStatus] = useState<TicketStatus>(currentStatus);
  const [resolutionNote, setResolutionNote] = useState(
    currentResolutionNote ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const confirmAction = useConfirmDialog();
  const { operation, isWorking: submitting, begin, cancel, finishWithRefresh } = useRenderedOperation();
  const availableStatusOptions = STATUS_OPTIONS.filter(
    (option) => STATUS_PROGRESS[option.value] >= STATUS_PROGRESS[currentStatus],
  );

  if (currentStatus === "CLOSED") {
    return <p className="text-sm text-zinc-500">ผู้ใช้ยืนยันผลและปิดคำร้องนี้แล้ว</p>;
  }

  async function handleSubmit() {
    const selectedStatus = STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
    if (!(await confirmAction({
      title: "ยืนยันการเปลี่ยนสถานะคำร้อง",
      description: `สถานะคำร้องจะเปลี่ยนเป็น “${selectedStatus}” และผู้ใช้จะเห็นข้อมูลล่าสุด`,
      confirmLabel: "บันทึกสถานะ",
    }))) return;

    setError(null);
    begin({
      title: "กำลังอัปเดตสถานะคำร้อง...",
      description: "กรุณารอสักครู่ ระบบกำลังบันทึกและแสดงสถานะล่าสุด",
    });

    try {
      const response = await fetch(`/api/staff/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Skip-Global-Activity": "true" },
        body: JSON.stringify({
          status,
          resolutionNote: resolutionNote.trim() || null,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "อัปเดตไม่สำเร็จ");
      }

      finishWithRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "อัปเดตไม่สำเร็จ");
      cancel();
    }
  }

  return (
    <div className="staff-update-form">
      {operation && <PageTransitionPopup {...operation} portalToBody />}
      <label>สถานะ</label>
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as TicketStatus)}
        className="staff-status-select"
      >
        {availableStatusOptions.map((option) => (
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
