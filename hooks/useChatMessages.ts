"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderType: "USER" | "AI" | "STAFF";
  content: string;
  createdAt: string;
}

interface MessagesResponse {
  messages: ChatMessage[];
  error?: string;
}

export function useChatMessages(pollIntervalMs = 4000) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/messages", { cache: "no-store" });
      const data = (await response.json()) as MessagesResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "ไม่สามารถโหลดข้อความได้");
      }

      setMessages(data.messages);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ไม่สามารถโหลดข้อความได้");
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      const temporaryMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        senderId: "me",
        senderType: "USER",
        content: trimmedContent,
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, temporaryMessage]);

      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmedContent }),
        });
        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "ไม่สามารถส่งข้อความได้");
        }

        setError(null);
        await fetchMessages();
      } catch (cause) {
        setMessages((current) =>
          current.filter((message) => message.id !== temporaryMessage.id),
        );
        const message =
          cause instanceof Error ? cause.message : "ไม่สามารถส่งข้อความได้";
        setError(message);
        throw cause;
      }
    },
    [fetchMessages],
  );

  useEffect(() => {
    const initialFetchTimer = setTimeout(() => void fetchMessages(), 0);
    timerRef.current = setInterval(() => void fetchMessages(), pollIntervalMs);

    return () => {
      clearTimeout(initialFetchTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchMessages, pollIntervalMs]);

  return { messages, sendMessage, loading, error };
}
