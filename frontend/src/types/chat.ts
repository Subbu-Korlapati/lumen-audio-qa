/** Shape returned by the backend `POST /ask` endpoint (see backend README). */
export interface AskResponse {
  answer: string;
  sources: string[];
}

/** Payload sent to `POST /ask`. */
export interface AskRequest {
  question: string;
}

export type MessageRole = "user" | "assistant";

export type MessageStatus = "pending" | "complete" | "error";

/** A single message rendered in the chat transcript. */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** Source article filenames the answer was grounded in (assistant only). */
  sources: string[];
  status: MessageStatus;
  /** True when the assistant declined because the KB did not cover the question. */
  refused?: boolean;
  createdAt: number;
}
