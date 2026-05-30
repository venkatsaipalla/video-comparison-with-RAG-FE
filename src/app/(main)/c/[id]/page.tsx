"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatPanel, type ChatMessage } from "@/components/ChatPanel";
import { VideoCard } from "@/components/VideoCard";
import {
  comparisonToSessionStatus,
  getComparison,
  initSession,
  storedMessagesToChat,
  type SessionStatus,
} from "@/lib/api";
import { useBackendUserId } from "@/hooks/useBackendUser";

export default function ComparisonPage() {
  const params = useParams();
  const router = useRouter();
  const comparisonId = params.id as string;
  const userId = useBackendUserId();
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const [videoAUrl, setVideoAUrl] = useState("");
  const [videoBUrl, setVideoBUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [loadingComparison, setLoadingComparison] = useState(true);
  const [syncingConversation, setSyncingConversation] = useState(false);

  const reloadConversation = useCallback(async () => {
    if (!userId) return;
    setSyncingConversation(true);
    try {
      const detail = await getComparison(userId, comparisonId);
      setInitialMessages(storedMessagesToChat(detail.messages));
    } catch {
      // Keep local messages if refresh fails.
    } finally {
      setSyncingConversation(false);
    }
  }, [userId, comparisonId]);

  useEffect(() => {
    if (!userId) return;
    const uid = userId;
    let cancelled = false;

    async function load() {
      setError(null);
      setLoadingComparison(true);
      try {
        const detail = await getComparison(uid, comparisonId);
        if (cancelled) return;
        setVideoIds(detail.video_ids);
        setVideoAUrl(detail.video_a_url);
        setVideoBUrl(detail.video_b_url);
        setSession(comparisonToSessionStatus(detail));
        setInitialMessages(storedMessagesToChat(detail.messages));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load comparison");
        }
      } finally {
        if (!cancelled) setLoadingComparison(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, comparisonId]);

  async function retrySameVideos() {
    if (!userId || !videoAUrl || !videoBUrl) return;
    setRetryError(null);
    setRetrying(true);
    try {
      const data = await initSession(userId, videoAUrl, videoBUrl);
      router.push(`/c/${data.session_id}`);
    } catch (err) {
      setRetryError(
        err instanceof Error ? err.message : "Could not run again"
      );
    } finally {
      setRetrying(false);
    }
  }

  const ready = session?.status === "ready";
  const chatKey = useMemo(
    () => `${comparisonId}-${initialMessages.length}`,
    [comparisonId, initialMessages.length]
  );

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
        {videoAUrl && videoBUrl && (
          <button
            type="button"
            disabled={retrying}
            onClick={() => void retrySameVideos()}
            className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-300 hover:border-brand-500 hover:text-brand-400 disabled:opacity-50"
          >
            {retrying ? "Running again…" : "New run (same videos)"}
          </button>
        )}
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            ready
              ? "bg-green-900/50 text-green-300"
              : "bg-stone-800 text-stone-400"
          }`}
        >
          {session?.status || (error ? "unavailable" : loadingComparison ? "loading" : "—")}
        </span>
      </div>

      {retryError && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
          {retryError}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <VideoCard
          label="Video A"
          video={session?.video_a ?? null}
          loading={loadingComparison && !error}
        />
        <VideoCard
          label="Video B"
          video={session?.video_b ?? null}
          loading={loadingComparison && !error}
        />
      </div>

      <div className="mt-8 h-[560px]">
        {userId && (
          <ChatPanel
            key={chatKey}
            userId={userId}
            sessionId={comparisonId}
            videoIds={videoIds}
            videoLabels={{
              a: session?.video_a?.title ?? "Video A",
              b: session?.video_b?.title ?? "Video B",
            }}
            initialMessages={initialMessages}
            onConversationSaved={reloadConversation}
            loadingHistory={loadingComparison && !error}
            syncingHistory={syncingConversation}
            disabled={!ready || !!error}
          />
        )}
      </div>
    </main>
  );
}
