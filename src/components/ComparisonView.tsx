"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { ChatPanel, type ChatMessage } from "@/components/ChatPanel";
import { VideoCard } from "@/components/VideoCard";
import {
  comparisonToSessionStatus,
  deleteComparison,
  getComparison,
  initSession,
  storedMessagesToChat,
  type SessionStatus,
} from "@/lib/api";
import { notifyComparisonDeleted } from "@/lib/comparison-events";

type Props = {
  comparisonId: string;
};

export function ComparisonView({ comparisonId }: Props) {
  const router = useRouter();
  const { data: authSession, status: authStatus } = useSession();
  const userId = authSession?.user?.backendUserId;
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const [videoAUrl, setVideoAUrl] = useState("");
  const [videoBUrl, setVideoBUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    if (authStatus === "loading") return;

    if (authStatus !== "authenticated" || !userId) {
      setLoadingComparison(false);
      setError("Sign in required to view this comparison.");
      return;
    }

    const ac = new AbortController();
    setError(null);
    setSession(null);
    setVideoIds([]);
    setVideoAUrl("");
    setVideoBUrl("");
    setInitialMessages([]);
    setLoadingComparison(true);

    void (async () => {
      try {
        const detail = await getComparison(userId, comparisonId, ac.signal);
        if (ac.signal.aborted) return;
        setVideoIds(detail.video_ids);
        setVideoAUrl(detail.video_a_url);
        setVideoBUrl(detail.video_b_url);
        setSession(comparisonToSessionStatus(detail));
        setInitialMessages(storedMessagesToChat(detail.messages));
      } catch (e) {
        if (ac.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(
          e instanceof Error ? e.message : "Could not load comparison"
        );
      } finally {
        if (!ac.signal.aborted) setLoadingComparison(false);
      }
    })();

    return () => ac.abort();
  }, [authStatus, userId, comparisonId]);

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

  async function handleDelete() {
    if (!userId || deleting) return;
    const ok = window.confirm(
      "Delete this comparison and all its chat messages? This cannot be undone."
    );
    if (!ok) return;

    setDeleting(true);
    try {
      await deleteComparison(userId, comparisonId);
      notifyComparisonDeleted(comparisonId);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete comparison"
      );
    } finally {
      setDeleting(false);
    }
  }

  const ready = session?.status === "ready";
  const showHistorySkeleton =
    loadingComparison && initialMessages.length === 0 && !error;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
        {videoAUrl && videoBUrl && (
          <button
            type="button"
            disabled={retrying || deleting}
            onClick={() => void retrySameVideos()}
            className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-300 hover:border-brand-500 hover:text-brand-400 disabled:opacity-50"
          >
            {retrying ? "Running again…" : "New run (same videos)"}
          </button>
        )}
        <button
          type="button"
          disabled={deleting || loadingComparison}
          onClick={() => void handleDelete()}
          className="rounded-full border border-red-900/60 px-3 py-1 text-xs text-red-400 hover:border-red-700 hover:text-red-300 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            ready
              ? "bg-green-900/50 text-green-300"
              : "bg-stone-800 text-stone-400"
          }`}
        >
          {session?.status ||
            (error ? "unavailable" : loadingComparison ? "loading" : "—")}
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
            key={comparisonId}
            userId={userId}
            sessionId={comparisonId}
            videoIds={videoIds}
            videoLabels={{
              a: session?.video_a?.title ?? "Video A",
              b: session?.video_b?.title ?? "Video B",
            }}
            initialMessages={initialMessages}
            onConversationSaved={reloadConversation}
            loadingHistory={showHistorySkeleton}
            syncingHistory={syncingConversation}
            disabled={!ready || !!error}
          />
        )}
      </div>
    </main>
  );
}
