import type { SessionStatus } from "@/lib/api";
import {
  metadataToVideoSummary,
  type VideoMetadata,
} from "@/lib/metadata";

const PREFIX = "cj_session_";

export type SessionBootstrap = {
  sessionId: string;
  videoIds: string[];
  titles: Record<string, string | null>;
  /** Per video_id metadata from GPU ingest (brain /init response). */
  metadata: Record<string, VideoMetadata>;
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
    const parsed = JSON.parse(raw) as SessionBootstrap;
    if (!parsed.metadata) parsed.metadata = {};
    return parsed;
  } catch {
    return null;
  }
}

/** Build FE session view from data saved at /init time. */
export function bootstrapToSessionStatus(
  bootstrap: SessionBootstrap
): SessionStatus {
  const [idA, idB] = bootstrap.videoIds;
  const meta = bootstrap.metadata ?? {};

  return {
    id: bootstrap.sessionId,
    status: "ready",
    error_message: null,
    video_a: metadataToVideoSummary(
      idA,
      bootstrap.videoAUrl,
      meta[idA],
      bootstrap.titles[idA] ?? null
    ),
    video_b: metadataToVideoSummary(
      idB,
      bootstrap.videoBUrl,
      meta[idB],
      bootstrap.titles[idB] ?? null
    ),
  };
}
