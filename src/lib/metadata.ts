import type { VideoSummary } from "@/lib/api";

/** Raw metadata blob from brain POST /init → metadata[video_id] */
export type VideoMetadata = Record<string, unknown>;

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
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

function engagementFromMetadata(md: VideoMetadata) {
  const views = num(md.view_count ?? md.views);
  const likes = num(md.like_count ?? md.likes);
  const comments = num(md.comment_count ?? md.comments);

  const eng =
    md.engagement && typeof md.engagement === "object"
      ? (md.engagement as Record<string, unknown>)
      : {};

  const like_rate =
    num(eng.like_rate) ??
    (views && likes != null ? likes / views : null);
  const comment_rate =
    num(eng.comment_rate) ??
    (views && comments != null ? comments / views : null);
  const engagement_rate =
    num(eng.engagement_rate) ??
    (like_rate != null && comment_rate != null
      ? like_rate + comment_rate
      : null);

  return {
    like_rate,
    comment_rate,
    engagement_rate,
  };
}

/** Map GPU/brain metadata into the VideoCard shape. */
export function metadataToVideoSummary(
  videoId: string,
  url: string,
  md: VideoMetadata | undefined,
  titleFallback: string | null
): VideoSummary {
  const m = md ?? {};
  const views = num(m.view_count ?? m.views);
  const likes = num(m.like_count ?? m.likes);
  const comments = num(m.comment_count ?? m.comments);
  const duration = num(m.duration ?? m.duration_sec);

  return {
    id: videoId,
    platform: str(m.platform) ?? guessPlatform(url),
    url,
    title: str(m.title) ?? titleFallback,
    creator: str(m.channel ?? m.creator ?? m.uploader),
    thumbnail_url: str(m.thumbnail_url ?? m.thumbnail),
    duration_sec: duration,
    views,
    likes,
    comments,
    engagement: engagementFromMetadata(m),
    ingest_status: "ready",
    ingest_error: null,
  };
}
