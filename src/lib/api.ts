const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type VideoSummary = {
  id: string;
  platform: string;
  url: string;
  title: string | null;
  creator: string | null;
  thumbnail_url: string | null;
  duration_sec: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  engagement: {
    like_rate?: number | null;
    comment_rate?: number | null;
    engagement_rate?: number | null;
  };
  ingest_status: string;
  ingest_error: string | null;
};

export type SessionStatus = {
  id: string;
  status: string;
  error_message: string | null;
  video_a: VideoSummary | null;
  video_b: VideoSummary | null;
};

export type Citation = {
  chunk_id: string;
  video_label: string;
  video_id: string;
  start_sec: number | null;
  end_sec: number | null;
  excerpt: string;
};

export async function createSession(
  videoAUrl: string,
  videoBUrl: string
): Promise<{ session_id: string; status: string }> {
  const res = await fetch(`${API_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_a_url: videoAUrl,
      video_b_url: videoBUrl,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg).join(", ")
          : "Failed to create session";
    throw new Error(msg);
  }
  return res.json();
}

export async function getSessionStatus(
  sessionId: string
): Promise<SessionStatus> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/status`);
  if (!res.ok) throw new Error("Failed to fetch session status");
  return res.json();
}

/** Parse one SSE block (events separated by blank lines). */
function dispatchSseBlock(
  block: string,
  handlers: {
    onToken: (text: string) => void;
    onCitation: (citation: Citation) => void;
    onDone: (data: { message_id: string; conversation_id: string }) => void;
    onError: (message: string) => void;
  }
) {
  let eventType = "message";
  const dataParts: string[] = [];

  for (const rawLine of block.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataParts.push(line.slice(5).trimStart());
    }
  }

  if (dataParts.length === 0) return;

  const raw = dataParts.join("\n");
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    handlers.onError(`Invalid server data: ${raw.slice(0, 120)}`);
    return;
  }

  if (eventType === "token" && typeof data.text === "string") {
    handlers.onToken(data.text);
  } else if (eventType === "citation") {
    handlers.onCitation(data as Citation);
  } else if (eventType === "done") {
    handlers.onDone(data as { message_id: string; conversation_id: string });
  } else if (eventType === "error") {
    handlers.onError(String(data.message ?? "Chat error"));
  }
}

export async function streamChat(
  sessionId: string,
  message: string,
  conversationId: string | null,
  handlers: {
    onToken: (text: string) => void;
    onCitation: (citation: Citation) => void;
    onDone: (data: { message_id: string; conversation_id: string }) => void;
    onError: (message: string) => void;
  }
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/sessions/${sessionId}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    });
  } catch {
    handlers.onError("Network error — is the API running?");
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    handlers.onError(
      typeof detail === "string" ? detail : `Chat failed (${res.status})`
    );
    return;
  }

  if (!res.body) {
    handlers.onError("No response stream from server");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");

      let sep = buffer.indexOf("\n\n");
      while (sep !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        if (block.trim()) dispatchSseBlock(block, handlers);
        sep = buffer.indexOf("\n\n");
      }
    }

    if (buffer.trim()) {
      dispatchSseBlock(buffer, handlers);
    }
  } catch {
    handlers.onError("Stream interrupted");
  }
}

export function formatRate(rate: number | null | undefined): string {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(2)}%`;
}

export function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id = u.searchParams.get("v");
      if (!id && u.pathname.includes("/shorts/")) {
        id = u.pathname.split("/shorts/")[1]?.split("/")[0];
      }
      if (!id && u.hostname.includes("youtu.be")) {
        id = u.pathname.slice(1);
      }
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}
