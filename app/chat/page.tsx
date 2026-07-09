"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatMessages, type ChatMessage } from "@/hooks/useChatMessages";

export default function ChatPage() {
  const {
    messages,
    sendMessage,
    escalateMessage,
    resolveMessage,
    loading,
    error,
  } = useChatMessages();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [ticketBanner, setTicketBanner] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string) => {
    const result = await sendMessage(content);
    if (result.ticketId) {
      setTicketBanner(result.ticketId);
    }
  };

  const handleEscalate = async (message: ChatMessage) => {
    const result = await escalateMessage(message.id);
    if (result.ticketId) {
      setTicketBanner(result.ticketId);
    }
  };

  const handleResolve = async (message: ChatMessage) => {
    await resolveMessage(message.id);
  };

  return (
    <main className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">แจ้งปัญหา</h1>
        <p className="text-sm text-zinc-500">
          ข้อความจะอัปเดตทุก 4 วินาที
        </p>
      </header>

      {ticketBanner && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <span>
            ระบบสร้าง ticket และส่งต่อให้เจ้าหน้าที่แล้ว
          </span>
          <Link
            href={`/tickets/${ticketBanner}`}
            className="shrink-0 font-medium underline"
          >
            ดู ticket
          </Link>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {loading && <p className="text-sm text-zinc-500">กำลังโหลด...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-zinc-500">
            ยังไม่มีข้อความ เริ่มพิมพ์ปัญหาที่พบได้เลย
          </p>
        )}
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            onEscalate={handleEscalate}
            onResolve={handleResolve}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-4 pb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <ChatInput onSend={handleSend} />
    </main>
  );
}
