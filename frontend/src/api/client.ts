import { API_BASE_URL, ENDPOINTS, REQUEST_TIMEOUT_MS } from "@/config";
import type { AskRequest, AskResponse } from "@/types/chat";

/** Error thrown for any non-successful interaction with the backend. */
export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("The request timed out. Please try again.");
    }
    throw new ApiError(
      "Couldn't reach the assistant. Check that the backend is running.",
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await safeErrorDetail(response);
    throw new ApiError(detail ?? `Request failed (${response.status}).`, response.status);
  }

  return (await response.json()) as T;
}

async function safeErrorDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { error?: string; detail?: string };
    return body.detail ?? body.error ?? null;
  } catch {
    return null;
  }
}

/** Ask the backend a question; returns a grounded answer with its sources. */
export function ask(question: string): Promise<AskResponse> {
  const payload: AskRequest = { question };
  return request<AskResponse>(ENDPOINTS.ask, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Lightweight backend liveness check used by the header status indicator. */
export async function checkHealth(): Promise<boolean> {
  try {
    await request<{ ok: boolean }>(ENDPOINTS.health, { method: "GET" });
    return true;
  } catch {
    return false;
  }
}
