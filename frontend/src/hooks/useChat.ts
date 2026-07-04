import { useCallback, useState } from "react";

import { ApiError, ask } from "@/api/client";
import type { ChatMessage } from "@/types/chat";

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeMessage(partial: Partial<ChatMessage> & Pick<ChatMessage, "role">): ChatMessage {
  return {
    id: createId(),
    content: "",
    sources: [],
    status: "complete",
    createdAt: Date.now(),
    ...partial,
  };
}

interface UseChatResult {
  messages: ChatMessage[];
  isSending: boolean;
  sendMessage: (question: string) => Promise<void>;
  clear: () => void;
}

/**
 * Owns the chat transcript and the request lifecycle for asking the backend.
 *
 * A pending assistant message is inserted immediately (so the UI can show a
 * typing indicator) and then updated in place with the answer, sources, or an
 * error once the request settles.
 */
export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...patch } : msg)),
    );
  }, []);

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isSending) return;

      const userMessage = makeMessage({ role: "user", content: trimmed });
      const pending = makeMessage({ role: "assistant", status: "pending" });
      setMessages((prev) => [...prev, userMessage, pending]);
      setIsSending(true);

      try {
        const { answer, sources } = await ask(trimmed);
        updateMessage(pending.id, {
          content: answer,
          sources,
          status: "complete",
          refused: sources.length === 0,
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Something went wrong. Please try again.";
        updateMessage(pending.id, { content: message, status: "error" });
      } finally {
        setIsSending(false);
      }
    },
    [isSending, updateMessage],
  );

  const clear = useCallback(() => setMessages([]), []);

  return { messages, isSending, sendMessage, clear };
}
