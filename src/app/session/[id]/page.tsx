"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { VideoCard } from "@/components/VideoCard";
import { getSessionStatus, SessionStatus } from "@/lib/api";
import Link from "next/link";

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const data = await getSessionStatus(sessionId);
        if (!active) return;
        setSession(data);
        if (data.status === "failed") {
          setError(data.error_message || "Ingest failed");
        }
        if (data.status === "ready" || data.status === "failed") {
          return true;
        }
      } catch {
        if (active) setError("Could not load session");
      }
      return false;
    }

    poll();
    const interval = setInterval(async () => {
      const done = await poll();
      if (done) clearInterval(interval);
    }, 2500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  const ready = session?.status === "ready";
  const ingesting =
    session?.status === "ingesting" || session?.status === "pending";

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-stone-500 hover:text-brand-500">
          ← New comparison
        </Link>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            ready
              ? "bg-green-900/50 text-green-300"
              : ingesting
                ? "bg-amber-900/50 text-amber-300"
                : "bg-stone-800 text-stone-400"
          }`}
        >
          {session?.status || "loading"}
        </span>
      </div>

      {ingesting && (
        <div className="mb-6 rounded-xl border border-amber-800/50 bg-amber-950/30 p-4 text-sm text-amber-100">
          Ingesting transcripts, metadata, and embeddings… This can take 1–3
          minutes on first run.
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
        <ChatPanel sessionId={sessionId} disabled={!ready} />
      </div>
    </main>
  );
}
