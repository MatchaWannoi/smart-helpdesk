"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { useConfirmDialog } from "@/components/feedback/ConfirmDialogProvider";
import { useChatMessages, type ChatMessage } from "@/hooks/useChatMessages";

export default function ChatPage() {
  const confirmAction = useConfirmDialog();
  const {
    messages,
    sendMessage,
    escalateMessage,
    resolveMessage,
    loading,
    isReplying,
    error,
  } = useChatMessages();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [ticketBanner, setTicketBanner] = useState<{
    id: string;
    kind: "escalated" | "resolved";
  } | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string) => {
    const result = await sendMessage(content);
    if (result.ticketId) {
      setTicketBanner({ id: result.ticketId, kind: "escalated" });
    }
  };

  const handleEscalate = async (message: ChatMessage) => {
    if (!(await confirmAction({ title: "ส่งปัญหาให้เจ้าหน้าที่หรือไม่?", description: "ระบบจะสร้างคำร้องและส่งข้อมูลการสนทนาให้เจ้าหน้าที่ดูแลต่อ", confirmLabel: "ส่งให้เจ้าหน้าที่" }))) return;
    const result = await escalateMessage(message.id);
    if (result.ticketId) {
      setTicketBanner({ id: result.ticketId, kind: "escalated" });
    }
  };

  const handleResolve = async (message: ChatMessage) => {
    if (!(await confirmAction({ title: "ยืนยันว่าแก้ปัญหาได้แล้วหรือไม่?", description: "ระบบจะบันทึกว่าคำแนะนำจาก AI แก้ปัญหาได้สำเร็จ", confirmLabel: "ยืนยันว่าแก้ได้" }))) return;
    const result = await resolveMessage(message.id);
    if (result.ticketId) setTicketBanner({ id: result.ticketId, kind: "resolved" });
  };

  const suggestions = [
    { icon: "⌁", label: "เครือข่าย", text: "อินเทอร์เน็ตใช้งานไม่ได้ ต้องตรวจสอบอย่างไร" },
    { icon: "⌕", label: "บัญชีผู้ใช้", text: "ลืมรหัสผ่านและไม่สามารถเข้าสู่ระบบได้" },
    { icon: "▣", label: "ฮาร์ดแวร์", text: "คอมพิวเตอร์เปิดไม่ติด ต้องแก้ไขอย่างไร" },
  ];

  return (
    <main className="chat-workspace">
      <header className="chat-heading">
        <div><span className="chat-kicker">✦ AI ASSISTANT</span><h1>แชทกับ AI ผู้ช่วย</h1>
        <p>อธิบายปัญหาที่พบ แล้วเราจะช่วยหาทางแก้ไข</p></div>
        <span className="online-pill"><i/>AI พร้อมให้บริการ</span>
      </header>

      {ticketBanner && (
        <div className="ticket-banner">
          <span>
            {ticketBanner.kind === "resolved"
              ? "บันทึกว่าแก้ไขสำเร็จและหยุดจับเวลาแล้ว"
              : "ระบบสร้าง ticket และส่งต่อให้เจ้าหน้าที่แล้ว"}
          </span>
          <Link
            href={`/tickets/${ticketBanner.id}`}
            className="shrink-0 font-medium underline"
          >
            ดู ticket
          </Link>
        </div>
      )}

      <section className="chat-panel">
        <div className="chat-messages">
          {loading && <p className="chat-loading">กำลังโหลดบทสนทนา...</p>}
          {!loading && messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-ghost" aria-hidden="true"><i/><i/><span/></div>
              <span className="chat-sparkle">✦</span>
              <h2>สวัสดีครับ มีอะไรให้ช่วยไหม?</h2>
              <p>ลองพิมพ์อธิบายปัญหาที่พบได้เลย ระบบ AI สามารถช่วยวิเคราะห์ปัญหาทางเทคนิคและแนะนำวิธีแก้ไขเบื้องต้นให้คุณได้ทันที</p>
              <div className="chat-suggestions">
                {suggestions.map((suggestion) => (
                  <button key={suggestion.label} type="button" onClick={() => void handleSend(suggestion.text)}>
                    <span><b>{suggestion.icon}</b><strong>{suggestion.label}</strong></span>
                    <small>{suggestion.text}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              onEscalate={handleEscalate}
              onResolve={handleResolve}
            />
          ))}
          {isReplying && (
            <div className="ai-typing" role="status" aria-live="polite">
              <span className="ai-typing-avatar" aria-hidden="true">✦</span>
              <div>
                <small>AI Assistant กำลังวิเคราะห์และพิมพ์คำตอบ</small>
                <span className="typing-dots" aria-hidden="true"><i /><i /><i /></span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="chat-error" role="alert">{error}</p>}
        <ChatInput onSend={handleSend} />
      </section>
    </main>
  );
}
