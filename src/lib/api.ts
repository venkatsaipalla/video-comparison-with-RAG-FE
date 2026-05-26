import { getApiBaseUrl, getApiTimeoutMs } from "@/lib/env";
import { getUserId } from "@/lib/user";

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

export type InitResponse = {
  session_id: string;
  video_ids: string[];
  titles: Record<string, string | null>;
  /** GPU ingest metadata keyed by video_id (views, channel, duration, …). */
  metadata: Record<string, Record<string, unknown>>;
};

export type ChatResponse = {
  session_id: string;
  answer: string;
  state: Record<string, unknown>;
};

export type Citation = {
  chunk_id: string;
  video_label: string;
  video_id: string;
  start_sec: number | null;
  end_sec: number | null;
  excerpt: string;
};

type Evidence = {
  quote?: string;
  video_id?: string | null;
  start_time?: number | null;
  end_time?: number | null;
};

async function apiFetch(path: string, init: RequestInit): Promise<Response> {
  const timeoutMs = getApiTimeoutMs();
  try {
    return await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      signal:
        timeoutMs !== undefined ? AbortSignal.timeout(timeoutMs) : undefined,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      const sec = Math.round((timeoutMs ?? 0) / 1000);
      throw new Error(
        `Request timed out after ${sec}s. Increase NEXT_PUBLIC_API_TIMEOUT_SEC in .env if needed.`
      );
    }
    throw e;
  }
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const err = await res.json().catch(() => ({}));
  const detail = (err as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === "object" && d && "msg" in d ? String(d.msg) : ""))
      .filter(Boolean)
      .join(", ");
  }
  return fallback;
}

/**
 * POST /init — ingest both URLs on GPU, create ADK session, return session_id.
 * Can take 1–3+ minutes while the retrieval service ingests.
 */
export async function initSession(
  videoAUrl: string,
  videoBUrl: string
): Promise<InitResponse> {
  const res = await apiFetch("/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: getUserId(),
      urls: [videoAUrl.trim(), videoBUrl.trim()],
    }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to start session"));
  }
  return res.json();
}

/** Wake the brain proxy before the first chat (helps cold dev tunnels). */
export async function warmupBrainApi(): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/health`, { method: "GET" });
  } catch {
    // Non-fatal; chat will still attempt the real request.
  }
}

/** POST /chat — full answer (non-streaming). */
export async function sendChat(
  sessionId: string,
  message: string
): Promise<ChatResponse> {
  const res = await apiFetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: getUserId(),
      session_id: sessionId,
      message,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, `Chat failed (${res.status})`));
  }
  return res.json();
}

function parseAnalysisState(
  state: Record<string, unknown>
): Record<string, unknown> | null {
  let analysis = state.analysis;
  if (typeof analysis === "string") {
    try {
      analysis = JSON.parse(analysis) as unknown;
    } catch {
      return null;
    }
  }
  if (!analysis || typeof analysis !== "object") return null;
  return analysis as Record<string, unknown>;
}

/** Pull evidence items from brain `state.analysis` for the sources panel. */
export function citationsFromState(
  state: Record<string, unknown>,
  videoIds: string[]
): Citation[] {
  const a = parseAnalysisState(state);
  if (!a) return [];
  const labelFor = (videoId: string | null | undefined) => {
    if (!videoId) return "Video";
    const i = videoIds.indexOf(videoId);
    if (i === 0) return "Video A";
    if (i === 1) return "Video B";
    return videoId;
  };

  const out: Citation[] = [];
  const seen = new Set<string>();

  const add = (ev: Evidence) => {
    const vid = ev.video_id ?? "";
    const key = `${vid}:${ev.start_time}:${ev.quote?.slice(0, 40)}`;
    if (!ev.quote || seen.has(key)) return;
    seen.add(key);
    out.push({
      chunk_id: key,
      video_label: labelFor(ev.video_id),
      video_id: vid,
      start_sec: ev.start_time ?? null,
      end_sec: ev.end_time ?? null,
      excerpt: ev.quote.slice(0, 400),
    });
  };

  const collect = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return;
    const o = obj as Record<string, unknown>;
    if (Array.isArray(o.evidence)) {
      for (const e of o.evidence) add(e as Evidence);
    }
    if (o.per_video_summary && typeof o.per_video_summary === "object") {
      for (const v of Object.values(
        o.per_video_summary as Record<string, unknown>
      )) {
        collect(v);
      }
    }
    if (o.notable_moments && Array.isArray(o.notable_moments)) {
      for (const e of o.notable_moments) add(e as Evidence);
    }
  };

  collect(a.comparison);
  collect(a.virality);
  collect(a.timeline);
  if (a.per_video_summary && typeof a.per_video_summary === "object") {
    for (const v of Object.values(
      a.per_video_summary as Record<string, unknown>
    )) {
      collect(v);
    }
  }

  return out;
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
