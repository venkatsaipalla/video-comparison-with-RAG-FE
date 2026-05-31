import { getApiBaseUrl, getApiTimeoutMs, getClientChatTimeoutMs } from "@/lib/env";
import type { VideoMetadata } from "@/lib/metadata";
import { metadataToVideoSummary } from "@/lib/metadata";

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
  /** Cross-encoder rerank score from retrieval (higher = more relevant). */
  rerank_score?: number | null;
};

export type ComparisonListItem = {
  id: string;
  title: string | null;
  video_a_url: string;
  video_b_url: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  created_at: string;
};

/** Chat row restored from Postgres (matches ChatPanel message shape). */
export type PersistedChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  status: "complete";
};

/** Map persisted API messages → chat UI rows. */
export function storedMessagesToChat(
  messages: StoredMessage[]
): PersistedChatMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    citations: normalizeCitations(m.citations),
    status: "complete" as const,
  }));
}

function normalizeCitations(raw: unknown): Citation[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: Citation[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    const excerpt = String(c.excerpt ?? c.quote ?? "");
    if (!excerpt) continue;
    out.push({
      chunk_id: String(c.chunk_id ?? `${c.video_id}:${c.start_sec}:${excerpt.slice(0, 40)}`),
      video_label: String(c.video_label ?? "Video"),
      video_id: String(c.video_id ?? ""),
      start_sec: typeof c.start_sec === "number" ? c.start_sec : null,
      end_sec: typeof c.end_sec === "number" ? c.end_sec : null,
      excerpt: excerpt.slice(0, 400),
      rerank_score:
        typeof c.rerank_score === "number" ? c.rerank_score : null,
    });
  }
  return out.length ? out : undefined;
}

export type ComparisonDetail = {
  id: string;
  title: string | null;
  video_a_url: string;
  video_b_url: string;
  video_ids: string[];
  titles: Record<string, string | null>;
  metadata: Record<string, VideoMetadata>;
  status: string;
  messages: StoredMessage[];
};

type Evidence = {
  quote?: string;
  video_id?: string | null;
  start_time?: number | null;
  end_time?: number | null;
};

async function apiFetch(path: string, init: RequestInit): Promise<Response> {
  const timeoutMs = getApiTimeoutMs();
  const signal =
    init.signal ??
    (timeoutMs !== undefined ? AbortSignal.timeout(timeoutMs) : undefined);

  try {
    return await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      signal,
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw e;
    }
    if (e instanceof Error && e.name === "TimeoutError") {
      const sec = Math.round((timeoutMs ?? 0) / 1000);
      throw new Error(
        `Request timed out after ${sec}s. Increase NEXT_PUBLIC_API_TIMEOUT_SEC in .env if needed.`
      );
    }
    throw e;
  }
}

/**
 * Same-origin POST /chat — Next.js forwards to `BACKEND_API_URL` server-side.
 * Avoids browser → dev-tunnel CORS/auth issues and the catch-all brain proxy.
 */
async function chatFetch(body: string, signal?: AbortSignal): Promise<Response> {
  const timeoutMs = getClientChatTimeoutMs();
  return fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: signal ?? AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
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

export async function listComparisons(
  userId: string
): Promise<ComparisonListItem[]> {
  const res = await apiFetch(`/users/${userId}/comparisons`, { method: "GET" });
  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to load history"));
  }
  return res.json();
}

export async function getComparison(
  userId: string,
  comparisonId: string,
  signal?: AbortSignal
): Promise<ComparisonDetail> {
  const res = await apiFetch(
    `/comparisons/${comparisonId}?user_id=${encodeURIComponent(userId)}`,
    { method: "GET", signal }
  );
  if (!res.ok) {
    throw new Error(await parseError(res, "Comparison not found"));
  }
  return res.json();
}

export async function deleteComparison(
  userId: string,
  comparisonId: string
): Promise<void> {
  const res = await apiFetch(
    `/comparisons/${comparisonId}?user_id=${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    throw new Error(await parseError(res, "Could not delete comparison"));
  }
}

/** Build FE session view from persisted comparison row. */
export function comparisonToSessionStatus(
  detail: ComparisonDetail
): SessionStatus {
  const [idA, idB] = detail.video_ids;
  const meta = detail.metadata ?? {};

  return {
    id: detail.id,
    status: detail.status,
    error_message: null,
    video_a: idA
      ? metadataToVideoSummary(
          idA,
          detail.video_a_url,
          meta[idA],
          detail.titles[idA] ?? null
        )
      : null,
    video_b: idB
      ? metadataToVideoSummary(
          idB,
          detail.video_b_url,
          meta[idB],
          detail.titles[idB] ?? null
        )
      : null,
  };
}

/**
 * POST /init — ingest both URLs on GPU, create comparison + ADK session.
 * Can take 1–3+ minutes while the retrieval service ingests.
 */
export async function initSession(
  userId: string,
  videoAUrl: string,
  videoBUrl: string
): Promise<InitResponse> {
  const res = await apiFetch("/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      urls: [videoAUrl.trim(), videoBUrl.trim()],
    }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Failed to start session"));
  }
  return res.json();
}

/** Wake the brain API before the first chat (via proxy). */
export async function warmupBrainApi(): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/health`, { method: "GET", cache: "no-store" });
  } catch {
    // Non-fatal; chat will still attempt the real request.
  }
}

/** POST /chat — via dedicated `/api/chat` route (not catch-all `/api/brain/*`). */
export async function sendChat(
  userId: string,
  sessionId: string,
  message: string
): Promise<ChatResponse> {
  const body = JSON.stringify({
    user_id: userId,
    session_id: sessionId,
    message,
  });

  let res: Response;
  try {
    res = await chatFetch(body);
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      const sec = Math.round(getClientChatTimeoutMs() / 1000);
      throw new Error(
        `Chat timed out after ${sec}s. Set NEXT_PUBLIC_API_TIMEOUT_SEC (browser) and BRAIN_PROXY_TIMEOUT_SEC (server) in .env.`
      );
    }
    throw new Error(
      `Chat request failed. Is the backend reachable via BACKEND_API_URL? ${e instanceof Error ? e.message : String(e)}`
    );
  }

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

type RetrievalChunk = {
  text?: string;
  quote?: string;
  video_id?: string;
  start_time?: number | null;
  end_time?: number | null;
  rerank_score?: number | null;
};

function videoTitleFromState(
  state: Record<string, unknown>,
  videoId: string
): string | null {
  const meta = state.metadata;
  if (!meta || typeof meta !== "object") return null;
  const row = (meta as Record<string, unknown>)[videoId];
  if (!row || typeof row !== "object") return null;
  const title = (row as Record<string, unknown>).title;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

/** Pull retrieved chunks + evidence from brain chat `state` for the sources panel. */
export function citationsFromState(
  state: Record<string, unknown>,
  videoIds: string[]
): Citation[] {
  const labelFor = (videoId: string | null | undefined) => {
    if (!videoId) return "Video";
    const title = videoTitleFromState(state, videoId);
    const slot =
      videoIds.indexOf(videoId) === 0
        ? "Video A"
        : videoIds.indexOf(videoId) === 1
          ? "Video B"
          : null;
    if (title && slot) return `${slot} · ${title}`;
    if (slot) return slot;
    if (title) return title;
    return videoId;
  };

  const out: Citation[] = [];
  const seen = new Set<string>();

  const add = (
    videoId: string,
    start: number | null | undefined,
    end: number | null | undefined,
    excerpt: string,
    rerankScore?: number | null
  ) => {
    const text = excerpt.trim();
    if (!text) return;
    const key = `${videoId}:${start ?? ""}:${text.slice(0, 48)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      chunk_id: key,
      video_label: labelFor(videoId),
      video_id: videoId,
      start_sec: start ?? null,
      end_sec: end ?? null,
      excerpt: text.slice(0, 400),
      rerank_score: rerankScore ?? null,
    });
  };

  const addChunk = (raw: RetrievalChunk) => {
    const excerpt = raw.text ?? raw.quote ?? "";
    add(
      String(raw.video_id ?? ""),
      raw.start_time,
      raw.end_time,
      excerpt,
      raw.rerank_score
    );
  };

  const addEvidence = (ev: Evidence) => {
    if (!ev.quote) return;
    add(
      String(ev.video_id ?? ""),
      ev.start_time,
      ev.end_time,
      ev.quote
    );
  };

  // Primary: RAG context chunks used to ground the answer.
  if (Array.isArray(state.context_chunks)) {
    for (const raw of state.context_chunks) {
      if (raw && typeof raw === "object") addChunk(raw as RetrievalChunk);
    }
  }

  const ctx = state.context;
  if (ctx && typeof ctx === "object") {
    const chunksByVideo = (ctx as Record<string, unknown>).chunks_by_video;
    if (chunksByVideo && typeof chunksByVideo === "object") {
      for (const chunks of Object.values(chunksByVideo)) {
        if (!Array.isArray(chunks)) continue;
        for (const raw of chunks) {
          if (raw && typeof raw === "object") addChunk(raw as RetrievalChunk);
        }
      }
    }
  }

  // Fallback: analysis evidence quotes.
  const a = parseAnalysisState(state);
  if (a) {
    const collect = (obj: unknown) => {
      if (!obj || typeof obj !== "object") return;
      const o = obj as Record<string, unknown>;
      if (Array.isArray(o.evidence)) {
        for (const e of o.evidence) addEvidence(e as Evidence);
      }
      if (o.per_video_summary && typeof o.per_video_summary === "object") {
        for (const v of Object.values(
          o.per_video_summary as Record<string, unknown>
        )) {
          collect(v);
        }
      }
      if (Array.isArray(o.notable_moments)) {
        for (const e of o.notable_moments) addEvidence(e as Evidence);
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
