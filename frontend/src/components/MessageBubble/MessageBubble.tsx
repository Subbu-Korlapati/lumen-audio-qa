import { Sources } from "@/components/Sources";
import { TypingIndicator } from "@/components/TypingIndicator";
import type { ChatMessage } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isPending = message.status === "pending";
  const isError = message.status === "error";

  return (
    <div
      className={`flex animate-fade-in-up gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <Avatar isUser={isUser} />

      <div className={`flex max-w-[78%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={[
            "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
            isUser
              ? "rounded-br-md bg-brand-600 text-white"
              : isError
                ? "rounded-bl-md border border-rose-200 bg-rose-50 text-rose-700"
                : "rounded-bl-md border border-slate-200 bg-white text-slate-800",
          ].join(" ")}
        >
          {isPending ? (
            <TypingIndicator />
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {!isUser && !isPending && !isError && (
            <Sources sources={message.sources} />
          )}
        </div>

        {!isUser && message.refused && !isPending && (
          <span className="mt-1 px-1 text-[11px] text-slate-400">
            Not covered by the knowledge base
          </span>
        )}
      </div>
    </div>
  );
}

function Avatar({ isUser }: { isUser: boolean }) {
  return (
    <div
      className={[
        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        isUser ? "bg-slate-200 text-slate-600" : "bg-brand-600 text-white",
      ].join(" ")}
      aria-hidden
    >
      {isUser ? "You" : "L"}
    </div>
  );
}
