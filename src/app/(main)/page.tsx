"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { initSession } from "@/lib/api";
import { useBackendUserId } from "@/hooks/useBackendUser";
import { InlineProgress } from "@/components/loaders";

export default function HomePage() {
  const router = useRouter();
  const userId = useBackendUserId();
  const [videoA, setVideoA] = useState("");
  const [videoB, setVideoB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runCompare() {
    if (!userId) {
      setError("Sign-in is still loading. Try again in a moment.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const videoAUrl = videoA.trim();
      const videoBUrl = videoB.trim();
      const data = await initSession(userId, videoAUrl, videoBUrl);
      router.push(`/c/${data.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void runCompare();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="mb-2 text-sm font-medium uppercase tracking-widest text-brand-500">
        Creatorjoy screening
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-stone-50">
        Compare two videos with cited AI chat
      </h1>
      <p className="mt-4 text-stone-400">
        Paste two video URLs. We ingest them on the GPU pipeline, then you can
        ask why one outperformed the other.
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-4">
        <label className="block">
          <span className="text-sm text-stone-400">Video A URL</span>
          <input
            required
            type="url"
            value={videoA}
            onChange={(e) => setVideoA(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-stone-100 outline-none focus:border-brand-500"
          />
        </label>
        <label className="block">
          <span className="text-sm text-stone-400">Video B URL</span>
          <input
            required
            type="url"
            value={videoB}
            onChange={(e) => setVideoB(e.target.value)}
            placeholder="https://www.tiktok.com/@user/video/..."
            className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-stone-100 outline-none focus:border-brand-500"
          />
        </label>
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
            <p>{error}</p>
            <button
              type="button"
              disabled={loading || !videoA.trim() || !videoB.trim()}
              onClick={() => void runCompare()}
              className="mt-3 w-full rounded-lg border border-red-700/80 bg-red-900/30 py-2 text-sm font-medium text-red-100 hover:bg-red-900/50 disabled:opacity-50"
            >
              {loading ? "Trying again…" : "Try again with same URLs"}
            </button>
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !userId}
          className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Starting analysis…" : "Analyze & compare"}
        </button>
        {loading && (
          <InlineProgress
            label="Ingesting both videos"
            detail="This usually takes 1–3 minutes. You can keep browsing the sidebar."
          />
        )}
      </form>

      <ul className="mt-8 list-inside list-disc text-sm text-stone-500">
        <li>Supports YouTube, Shorts, TikTok, and public Instagram Reels</li>
        <li>Ingest runs once at upload; chat uses your locked video pair</li>
        <li>Comparisons are saved to your account in the sidebar</li>
      </ul>
    </main>
  );
}
