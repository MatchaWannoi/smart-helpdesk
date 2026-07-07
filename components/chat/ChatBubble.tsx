import type { ChatMessage } from "@/hooks/useChatMessages";

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.senderType === "USER";
  const isAi = message.senderType === "AI";

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
      </div>
    </div>
  );
}
