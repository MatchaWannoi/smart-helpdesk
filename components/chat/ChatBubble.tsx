"use client";

import { useState } from "react";
import type { ChatMessage } from "@/hooks/useChatMessages";

interface ChatBubbleProps {
  message: ChatMessage;
  onEscalate?: (message: ChatMessage) => Promise<void>;
  onResolve?: (message: ChatMessage) => Promise<void>;
}

export function ChatBubble({
  message,
  onEscalate,
  onResolve,
}: ChatBubbleProps) {
  const isUser = message.senderType === "USER";
  const isAi = message.senderType === "AI";
  const [feedback, setFeedback] = useState<"resolved" | "escalated" | null>(
    message.aiMeta?.userFeedback ?? null,
  );
  const [escalating, setEscalating] = useState(false);
  const [resolving, setResolving] = useState(false);

  const canAskFeedback =
    isAi &&
    message.aiMeta?.confident === true &&
    !message.ticketId &&
    !message.aiMeta?.userFeedback;

  const handleResolve = async () => {
    if (!onResolve || resolving) return;

    setResolving(true);
    try {
      await onResolve(message);
      setFeedback("resolved");
    } catch {
      // The chat page shows the error banner from the hook.
    } finally {
      setResolving(false);
    }
  };

  const handleEscalate = async () => {
    if (!onEscalate || escalating) return;

    setEscalating(true);
    try {
      await onEscalate(message);
      setFeedback("escalated");
    } catch {
      // The chat page shows the error banner from the hook.
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[75%]">
        {isAi && (
          <span className="mb-1 ml-1 block text-xs text-zinc-500">
            AI Assistant
          </span>
        )}
        <div
          className={`rounded-2xl px-4 py-2 text-sm ${
            isUser
              ? "rounded-br-sm bg-blue-600 text-white"
              : isAi
                ? "rounded-bl-sm bg-blue-50 text-zinc-900 dark:bg-blue-950 dark:text-zinc-100"
                : "rounded-bl-sm bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          }`}
        >
          {message.content}
        </div>

        {canAskFeedback && feedback === null && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleResolve()}
              disabled={resolving}
              className="rounded-full border border-green-300 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950"
            >
              {resolving ? "กำลังบันทึก..." : "แก้ไขได้แล้ว"}
            </button>
            <button
              type="button"
              onClick={() => void handleEscalate()}
              disabled={escalating}
              className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
            >
              {escalating ? "กำลังส่งเรื่อง..." : "ยังไม่ได้แก้"}
            </button>
          </div>
        )}

        {feedback === "resolved" && (
          <p className="mt-1 ml-1 text-xs text-green-600 dark:text-green-400">
            ขอบคุณสำหรับการยืนยันค่ะ
          </p>
        )}

        {feedback === "escalated" && (
          <p className="mt-1 ml-1 text-xs text-amber-600 dark:text-amber-400">
            ส่งเรื่องต่อให้เจ้าหน้าที่แล้ว
          </p>
        )}
      </div>
    </div>
  );
}
