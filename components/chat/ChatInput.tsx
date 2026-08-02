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
    <div className="chat-input">
      <textarea
        className="chat-textbox"
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
        rows={1}
      />
      <button
        className="chat-send"
        type="button"
        onClick={() => void handleSend()}
        disabled={sending || !text.trim()}
      >
        {sending ? "..." : "➤"}
      </button>
      <div className="chat-input-meta">
        <span>◇ ENTERPRISE AI SECURITY ACTIVE</span>
        <span>กด Enter เพื่อส่งข้อความ</span>
      </div>
    </div>
  );
}
