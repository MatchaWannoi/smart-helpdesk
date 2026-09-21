"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MessageSenderType = "USER" | "AI" | "STAFF";

export interface ChatAiMeta {
  category: string;
  urgency: string;
  confident: boolean;
  suggestedFaqId: string | null;
  startedAt?: string;
  userFeedback?: "resolved" | "escalated";
  resolvedAt?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderType: MessageSenderType;
  content: string;
  createdAt: string;
  ticketId?: string | null;
  aiMeta?: ChatAiMeta | null;
}

export interface SendMessageResult {
  ticketId: string | null;
}

interface MessagesResponse {
  messages: ChatMessage[];
  error?: string;
}

interface SendMessageApiResponse {
  userMessage?: ChatMessage;
  aiMessage?: ChatMessage;
  ticketId?: string | null;
  error?: string;
}

interface EscalateApiResponse {
  ticketId?: string;
  userMessage?: ChatMessage;
  aiMessage?: ChatMessage;
  error?: string;
}

interface ResolveApiResponse {
  ticketId?: string;
  message?: ChatMessage;
  userMessage?: ChatMessage;
  aiMessage?: ChatMessage;
  error?: string;
}

export function useChatMessages(pollIntervalMs = 4000) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Messages moved into a ticket no longer come back from GET /api/messages,
  // so keep a client-side copy for the current chat session.
  const stickyMessagesRef = useRef<Map<string, ChatMessage>>(new Map());

  const mergeAndSetMessages = useCallback((fetched: ChatMessage[]) => {
    const merged = new Map<string, ChatMessage>();

    for (const message of stickyMessagesRef.current.values()) {
      merged.set(message.id, message);
    }

    for (const message of fetched) {
      merged.set(message.id, message);
    }

    const sorted = Array.from(merged.values()).sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    setMessages(sorted);
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/messages", { cache: "no-store" });
      const data = (await response.json()) as MessagesResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "ไม่สามารถโหลดข้อความได้");
      }

      mergeAndSetMessages(data.messages);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "ไม่สามารถโหลดข้อความได้",
      );
    } finally {
      setLoading(false);
    }
  }, [mergeAndSetMessages]);

  const sendMessage = useCallback(
    async (content: string): Promise<SendMessageResult> => {
      const trimmedContent = content.trim();
      if (!trimmedContent) return { ticketId: null };

      const temporaryMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        senderId: "me",
        senderType: "USER",
        content: trimmedContent,
        createdAt: new Date().toISOString(),
      };

      // Keep the optimistic message in the same store used by polling merges.
      // Otherwise a GET poll that finishes while AI is replying can temporarily
      // replace the UI with the older server list and make this message vanish.
      stickyMessagesRef.current.set(temporaryMessage.id, temporaryMessage);
      setMessages((current) => [...current, temporaryMessage]);
      setIsReplying(true);

      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Skip-Global-Activity": "true",
          },
          body: JSON.stringify({ content: trimmedContent }),
        });
        const data = (await response.json()) as SendMessageApiResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "ไม่สามารถส่งข้อความได้");
        }

        if (data.userMessage && data.aiMessage) {
          stickyMessagesRef.current.delete(temporaryMessage.id);
          stickyMessagesRef.current.set(data.userMessage.id, data.userMessage);
          stickyMessagesRef.current.set(data.aiMessage.id, data.aiMessage);

          setMessages((current) => {
            const merged = new Map(
              current
                .filter((message) => message.id !== temporaryMessage.id)
                .map((message) => [message.id, message]),
            );
            merged.set(data.userMessage!.id, data.userMessage!);
            merged.set(data.aiMessage!.id, data.aiMessage!);
            return Array.from(merged.values()).sort(
              (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );
          });
        }

        setError(null);
        await fetchMessages();

        return { ticketId: data.ticketId ?? null };
      } catch (cause) {
        stickyMessagesRef.current.delete(temporaryMessage.id);
        setMessages((current) =>
          current.filter((message) => message.id !== temporaryMessage.id),
        );
        const message =
          cause instanceof Error ? cause.message : "ไม่สามารถส่งข้อความได้";
        setError(message);
        throw cause;
      } finally {
        setIsReplying(false);
      }
    },
    [fetchMessages],
  );

  const escalateMessage = useCallback(
    async (aiMessageId: string): Promise<SendMessageResult> => {
      try {
        const response = await fetch(`/api/messages/${aiMessageId}/escalate`, {
          method: "POST",
          headers: { "X-Skip-Global-Activity": "true" },
        });
        const data = (await response.json()) as EscalateApiResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "ไม่สามารถส่งเรื่องต่อได้");
        }

        if (data.ticketId && data.userMessage && data.aiMessage) {
          stickyMessagesRef.current.set(data.userMessage.id, data.userMessage);
          stickyMessagesRef.current.set(data.aiMessage.id, data.aiMessage);
        }

        setError(null);
        await fetchMessages();

        return { ticketId: data.ticketId ?? null };
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "ไม่สามารถส่งเรื่องต่อได้";
        setError(message);
        throw cause;
      }
    },
    [fetchMessages],
  );

  const resolveMessage = useCallback(
    async (aiMessageId: string): Promise<SendMessageResult> => {
      try {
        const response = await fetch(`/api/messages/${aiMessageId}/resolve`, {
          method: "POST",
          headers: { "X-Skip-Global-Activity": "true" },
        });
        const data = (await response.json()) as ResolveApiResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "ไม่สามารถบันทึกผลการแก้ไขได้");
        }

        if (data.message) {
          stickyMessagesRef.current.set(data.message.id, data.message);
          setMessages((current) =>
            current.map((message) =>
              message.id === data.message?.id ? data.message : message,
            ),
          );
        }

        setError(null);
        await fetchMessages();
        return { ticketId: data.ticketId ?? null };
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "ไม่สามารถบันทึกผลการแก้ไขได้";
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

  return {
    messages,
    sendMessage,
    escalateMessage,
    resolveMessage,
    loading,
    isReplying,
    error,
  };
}
