"use client";

import { useState } from "react";

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setText("");

    try {
      await onSend(content);
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
      <input
        className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-60 dark:border-zinc-700"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void handleSend();
          }
        }}
        placeholder="พิมพ์ปัญหาที่พบ..."
        disabled={sending}
      />
      <button
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => void handleSend()}
        disabled={sending || !text.trim()}
      >
        {sending ? "กำลังส่ง..." : "ส่ง"}
      </button>
    </div>
  );
}
