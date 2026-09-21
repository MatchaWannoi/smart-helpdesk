"use client";

import { useState } from "react";
import {
  confirmTicketMessage,
  removePendingTicketMessage,
  showPendingTicketMessage,
} from "@/components/tickets/TicketMessageThread";
import type { ChatMessage } from "@/hooks/useChatMessages";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";

export function StaffReplyForm({
  ticketId,
  disabled = false,
}: {
  ticketId: string;
  disabled?: boolean;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || sending || disabled) return;

    setError(null);
    setSending(true);
    const temporaryId = showPendingTicketMessage(ticketId, trimmed, "STAFF");

    try {
      const response = await fetch(`/api/staff/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Skip-Global-Activity": "true" },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = (await response.json()) as { error?: string; message?: ChatMessage };

      if (!response.ok) {
        throw new Error(data.error ?? "ส่งข้อความไม่สำเร็จ");
      }

      if (!data.message) throw new Error("ไม่พบข้อมูลข้อความที่ส่ง");

      setContent("");
      confirmTicketMessage(ticketId, temporaryId, data.message);
    } catch (cause) {
      removePendingTicketMessage(ticketId, temporaryId);
      setError(
        cause instanceof Error ? cause.message : "ส่งข้อความไม่สำเร็จ",
      );
    } finally {
      setSending(false);
    }
  }

  if (disabled) {
    return (
      <p className="ticket-closed-note">
        Ticket นี้ปิดแล้ว จึงไม่สามารถส่งข้อความเพิ่มเติมได้
      </p>
    );
  }

  return (
    <div className="reply-composer staff-reply-composer">
      <label>
        ส่งข้อความถึงผู้ใช้
      </label>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={2}
        placeholder="พิมพ์ข้อความถึงผู้ใช้..."
        className="reply-textarea"
        disabled={sending}
        maxLength={MAX_MESSAGE_LENGTH}
      />
      <div className="reply-actions">
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !content.trim()}
          className="reply-submit"
        >
          {sending ? "กำลังส่ง..." : "ส่งข้อความ"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
