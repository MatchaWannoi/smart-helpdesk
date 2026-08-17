"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";

export function UserReplyForm({
  ticketId,
  disabled = false,
}: {
  ticketId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "ส่งข้อความไม่สำเร็จ");
      }

      setContent("");
      router.refresh();
    } catch (cause) {
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
        Ticket นี้ปิดแล้ว จึงไม่สามารถส่งข้อความเพิ่มได้
      </p>
    );
  }

  return (
    <div className="reply-composer">
      <label>
        ตอบกลับเจ้าหน้าที่
      </label>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={2}
        placeholder="พิมพ์ข้อความตอบกลับ..."
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
