"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      <p className="border-t border-zinc-200 pt-4 text-sm text-zinc-500 dark:border-zinc-800">
        Ticket นี้ปิดแล้ว จึงไม่สามารถส่งข้อความเพิ่มได้
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <label className="text-xs font-medium text-zinc-500">
        ตอบกลับเจ้าหน้าที่
      </label>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={2}
        placeholder="พิมพ์ข้อความตอบกลับ..."
        className="border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700"
        disabled={sending}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !content.trim()}
          className="bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "กำลังส่ง..." : "ส่งข้อความ"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
