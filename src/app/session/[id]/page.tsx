"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { VideoCard } from "@/components/VideoCard";
import type { SessionStatus } from "@/lib/api";
import {
  bootstrapToSessionStatus,
  loadSessionBootstrap,
} from "@/lib/session-store";

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = loadSessionBootstrap(sessionId);
    if (!bootstrap) {
      setError(
        "Session data not found in this browser. Start a new comparison from the home page."
      );
      return;
    }
    setVideoIds(bootstrap.videoIds);
    setSession(bootstrapToSessionStatus(bootstrap));
  }, [sessionId]);

  const ready = session?.status === "ready";

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
              : "bg-stone-800 text-stone-400"
          }`}
        >
          {session?.status || (error ? "unavailable" : "loading")}
        </span>
      </div>

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
          disabled={!ready || !!error}
        />
      </div>
    </main>
  );
}
