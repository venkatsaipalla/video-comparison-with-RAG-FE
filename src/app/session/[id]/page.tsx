"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { VideoCard } from "@/components/VideoCard";
import { initSession, type SessionStatus } from "@/lib/api";
import {
  bootstrapToSessionStatus,
  loadSessionBootstrap,
  saveSessionBootstrap,
  type SessionBootstrap,
} from "@/lib/session-store";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const [bootstrap, setBootstrap] = useState<SessionBootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    const data = loadSessionBootstrap(sessionId);
    if (!data) {
      setError(
        "Session data not found in this browser. Start a new comparison from the home page."
      );
      return;
    }
    setBootstrap(data);
    setVideoIds(data.videoIds);
    setSession(bootstrapToSessionStatus(data));
  }, [sessionId]);

  async function retrySameVideos() {
    if (!bootstrap) return;
    setRetryError(null);
    setRetrying(true);
    try {
      const data = await initSession(bootstrap.videoAUrl, bootstrap.videoBUrl);
      saveSessionBootstrap({
        sessionId: data.session_id,
        videoIds: data.video_ids,
        titles: data.titles,
        metadata: data.metadata ?? {},
        videoAUrl: bootstrap.videoAUrl,
        videoBUrl: bootstrap.videoBUrl,
      });
      router.push(`/session/${data.session_id}`);
    } catch (err) {
      setRetryError(
        err instanceof Error ? err.message : "Could not run again"
      );
    } finally {
      setRetrying(false);
    }
  }

  const ready = session?.status === "ready";

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-stone-500 hover:text-brand-500">
          ← New comparison
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {bootstrap && (
            <button
              type="button"
              disabled={retrying}
              onClick={() => void retrySameVideos()}
              className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-300 hover:border-brand-500 hover:text-brand-400 disabled:opacity-50"
            >
              {retrying ? "Running again…" : "Try again (same videos)"}
            </button>
          )}
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            ready
              ? "bg-green-900/50 text-green-300"
              : "bg-stone-800 text-stone-400"
          }`}
        >
          {session?.status || (error ? "unavailable" : "loading")}
        </span>
        </div>
      </div>

      {retryError && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
          {retryError}
          {bootstrap && (
            <button
              type="button"
              disabled={retrying}
              onClick={() => void retrySameVideos()}
              className="mt-3 block w-full rounded-lg border border-red-700/80 bg-red-900/30 py-2 text-sm font-medium text-red-100 hover:bg-red-900/50 disabled:opacity-50"
            >
              {retrying ? "Trying again…" : "Try again with same videos"}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <VideoCard label="Video A" video={session?.video_a ?? null} />
        <VideoCard label="Video B" video={session?.video_b ?? null} />
      </div>

      <div className="mt-8 h-[560px]">
        <ChatPanel
          sessionId={sessionId}
          videoIds={videoIds}
          videoLabels={{
            a: session?.video_a?.title ?? "Video A",
            b: session?.video_b?.title ?? "Video B",
          }}
          disabled={!ready || !!error}
        />
      </div>
    </main>
  );
}
