"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatBubble } from "@/components/chat/ChatBubble";
import type { ChatMessage, MessageSenderType } from "@/hooks/useChatMessages";

const MESSAGE_EVENT = "helpdesk:ticket-message";

type TicketMessageEventDetail =
  | { phase: "pending"; ticketId: string; message: ChatMessage }
  | { phase: "sent"; ticketId: string; temporaryId: string; message: ChatMessage }
  | { phase: "failed"; ticketId: string; temporaryId: string };

export function showPendingTicketMessage(
  ticketId: string,
  content: string,
  senderType: MessageSenderType,
) {
  const message: ChatMessage = {
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    senderId: "current-user",
    senderType,
    content,
    createdAt: new Date().toISOString(),
  };

  window.dispatchEvent(
    new CustomEvent<TicketMessageEventDetail>(MESSAGE_EVENT, {
      detail: { phase: "pending", ticketId, message },
    }),
  );

  return message.id;
}

export function confirmTicketMessage(
  ticketId: string,
  temporaryId: string,
  message: ChatMessage,
) {
  window.dispatchEvent(
    new CustomEvent<TicketMessageEventDetail>(MESSAGE_EVENT, {
      detail: { phase: "sent", ticketId, temporaryId, message },
    }),
  );
}

export function removePendingTicketMessage(ticketId: string, temporaryId: string) {
  window.dispatchEvent(
    new CustomEvent<TicketMessageEventDetail>(MESSAGE_EVENT, {
      detail: { phase: "failed", ticketId, temporaryId },
    }),
  );
}

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

function messagesSignature(messages: ChatMessage[]) {
  return messages
    .map((message) => `${message.id}|${message.createdAt}|${message.content}`)
    .join("\n");
}

export function TicketMessageThread({
  ticketId,
  endpoint,
  initialMessages,
  currentUserId,
  viewerRole,
}: {
  ticketId: string;
  endpoint: string;
  initialMessages: ChatMessage[];
  currentUserId?: string;
  viewerRole?: "USER" | "STAFF";
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const fetchingRef = useRef(false);
  const messagesSignatureRef = useRef(messagesSignature(initialMessages));

  const refreshMessages = useCallback(async () => {
    if (fetchingRef.current || document.visibilityState === "hidden") return;

    fetchingRef.current = true;
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = (await response.json()) as {
        messages?: ChatMessage[];
      };

      if (response.ok && data.messages) {
        const nextMessages = sortMessages(data.messages);
        const nextSignature = messagesSignature(nextMessages);

        // Avoid a render on every poll when no one has sent a new message.
        if (nextSignature !== messagesSignatureRef.current) {
          messagesSignatureRef.current = nextSignature;
          setMessages(nextMessages);
        }
      }
    } catch {
      // Keep the latest visible messages when a background refresh temporarily fails.
    } finally {
      fetchingRef.current = false;
    }
  }, [endpoint]);

  useEffect(() => {
    function handleMessage(event: Event) {
      const detail = (event as CustomEvent<TicketMessageEventDetail>).detail;
      if (!detail || detail.ticketId !== ticketId) return;

      if (detail.phase === "pending") {
        setPendingMessages((current) => [...current, detail.message]);
        return;
      }

      setPendingMessages((current) =>
        current.filter((message) => message.id !== detail.temporaryId),
      );

      if (detail.phase === "sent") {
        setMessages((current) => {
          const merged = new Map(current.map((message) => [message.id, message]));
          merged.set(detail.message.id, detail.message);
          const nextMessages = sortMessages(Array.from(merged.values()));
          messagesSignatureRef.current = messagesSignature(nextMessages);
          return nextMessages;
        });
      }
    }

    window.addEventListener(MESSAGE_EVENT, handleMessage);
    return () => window.removeEventListener(MESSAGE_EVENT, handleMessage);
  }, [ticketId]);

  useEffect(() => {
    const timer = window.setInterval(() => void refreshMessages(), 4000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshMessages();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshMessages]);

  const total = messages.length + pendingMessages.length;

  return (
    <>
      <div className="section-heading">
        <span>ประวัติการสนทนา</span>
        <small>{total} ข้อความ</small>
      </div>
      {total === 0 ? (
        <p className="text-sm text-zinc-500">ยังไม่มีข้อความใน ticket นี้</p>
      ) : (
        <div className="flex flex-col gap-3" aria-live="polite">
          {messages.map((message) => (
            <div key={message.id}>
              <ChatBubble
                message={message}
                currentUserId={currentUserId}
                viewerRole={viewerRole}
              />
              {message.senderType === "AI" && (
                <div className="chat-ai-divider" aria-label="จบข้อความจาก AI Assistant" />
              )}
            </div>
          ))}
          {pendingMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === currentUserId || message.senderId === "current-user" ? "justify-end" : "justify-start"}`}
            >
              <div className="pending-ticket-message">
                <div className="pending-ticket-bubble">{message.content}</div>
                <span className="pending-ticket-status">
                  กำลังส่ง
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
