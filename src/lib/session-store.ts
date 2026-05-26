import type { SessionStatus, VideoSummary } from "@/lib/api";

const PREFIX = "cj_session_";

export type SessionBootstrap = {
  sessionId: string;
  videoIds: string[];
  titles: Record<string, string | null>;
  videoAUrl: string;
  videoBUrl: string;
};

export function saveSessionBootstrap(data: SessionBootstrap): void {
  sessionStorage.setItem(PREFIX + data.sessionId, JSON.stringify(data));
}

export function loadSessionBootstrap(
  sessionId: string
): SessionBootstrap | null {
  const raw = sessionStorage.getItem(PREFIX + sessionId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionBootstrap;
  } catch {
    return null;
  }
}

function videoFromBootstrap(
  label: "Video A" | "Video B",
  videoId: string,
  url: string,
  title: string | null
): VideoSummary {
  return {
    id: videoId,
    platform: guessPlatform(url),
    url,
    title,
    creator: null,
    thumbnail_url: null,
    duration_sec: null,
    views: null,
    likes: null,
    comments: null,
    engagement: {},
    ingest_status: "ready",
    ingest_error: null,
  };
}

function guessPlatform(url: string): string {
  try {
    const h = new URL(url).hostname.replace("www.", "");
    if (h.includes("youtube") || h.includes("youtu.be")) return "youtube";
    if (h.includes("tiktok")) return "tiktok";
    if (h.includes("instagram")) return "instagram";
  } catch {
    /* ignore */
  }
  return "unknown";
}

/** Build FE session view from data saved at /init time. */
export function bootstrapToSessionStatus(
  bootstrap: SessionBootstrap
): SessionStatus {
  const [idA, idB] = bootstrap.videoIds;
  return {
    id: bootstrap.sessionId,
    status: "ready",
    error_message: null,
    video_a: videoFromBootstrap(
      "Video A",
      idA,
      bootstrap.videoAUrl,
      bootstrap.titles[idA] ?? null
    ),
    video_b: videoFromBootstrap(
      "Video B",
      idB,
      bootstrap.videoBUrl,
      bootstrap.titles[idB] ?? null
    ),
  };
}
