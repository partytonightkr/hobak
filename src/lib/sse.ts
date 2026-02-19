import { getAccessToken } from "./auth";

const API_BASE_URL = "/api/v1";

interface SSECallbacks {
  onEvent: (eventType: string, data: string) => void;
  onError?: () => void;
}

/**
 * Connect to an SSE endpoint using fetch (supports Authorization header).
 * Returns an abort function to close the connection.
 */
export function connectSSE(path: string, { onEvent, onError }: SSECallbacks): () => void {
  const controller = new AbortController();
  let cancelled = false;

  async function connect() {
    const token = getAccessToken();
    if (!token) {
      onError?.();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        credentials: "include",
      });

      if (!response.ok || !response.body) {
        onError?.();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "message";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            onEvent(currentEvent, line.slice(6));
            currentEvent = "message";
          }
          // Ignore comment lines (starting with :) and empty lines
        }
      }
    } catch {
      if (!cancelled) onError?.();
    }
  }

  connect();

  return () => {
    cancelled = true;
    controller.abort();
  };
}
