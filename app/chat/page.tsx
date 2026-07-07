"use client";

import { useEffect, useRef } from "react";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatMessages } from "@/hooks/useChatMessages";

export default function ChatPage() {
  const { messages, sendMessage, loading, error } = useChatMessages();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col">
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">แจ้งปัญหา</h1>
        <p className="text-sm text-zinc-500">ข้อความจะอัปเดตทุก 4 วินาที</p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading && <p className="text-sm text-zinc-500">กำลังโหลด...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-zinc-500">
            ยังไม่มีข้อความ เริ่มพิมพ์ปัญหาที่พบได้เลย
          </p>
        )}
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-4 pb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <ChatInput onSend={sendMessage} />
    </main>
  );
}
