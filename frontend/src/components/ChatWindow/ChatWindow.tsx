import { ChatInput } from "@/components/ChatInput";
import { Header } from "@/components/Header";
import { MessageList } from "@/components/MessageList";
import { useChat } from "@/hooks/useChat";
import { useHealth } from "@/hooks/useHealth";

/**
 * Top-level chat container: wires the chat + health hooks to the presentational
 * Header / MessageList / ChatInput components.
 */
export function ChatWindow() {
  const { messages, isSending, sendMessage, clear } = useChat();
  const health = useHealth();

  return (
    <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-none bg-white shadow-xl sm:my-6 sm:h-[calc(100%-3rem)] sm:rounded-2xl">
      <Header health={health} onClear={clear} canClear={messages.length > 0} />
      <MessageList
        messages={messages}
        onPickSuggestion={sendMessage}
        disabled={isSending}
      />
      <ChatInput onSend={sendMessage} disabled={isSending} />
    </div>
  );
}
