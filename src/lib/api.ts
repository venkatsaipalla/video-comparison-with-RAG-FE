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
  const res = await fetch(`${API_URL}/sessions/${sessionId}/chat`, {
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

  if (!res.ok || !res.body) {
    handlers.onError("Chat request failed");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventType = "message";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const raw = line.slice(5).trim();
        try {
          const data = JSON.parse(raw);
          if (eventType === "token") handlers.onToken(data.text);
          else if (eventType === "citation") handlers.onCitation(data);
          else if (eventType === "done") handlers.onDone(data);
          else if (eventType === "error") handlers.onError(data.message);
        } catch {
          /* ignore parse errors */
        }
      }
    }
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
