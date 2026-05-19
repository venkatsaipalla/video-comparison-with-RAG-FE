"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createSession } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [videoA, setVideoA] = useState("");
  const [videoB, setVideoB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { session_id } = await createSession(videoA.trim(), videoB.trim());
      router.push(`/session/${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
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
        Paste YouTube, YouTube Shorts, TikTok, or Instagram Reel URLs. We ingest
        transcripts and engagement metrics, then let you ask why one outperformed
        the other.
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
          <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Starting analysis…" : "Analyze & compare"}
        </button>
      </form>

      <ul className="mt-8 list-inside list-disc text-sm text-stone-500">
        <li>Supports YouTube, Shorts, TikTok, and public Instagram Reels</li>
        <li>Streaming chat with chunk citations and conversation memory</li>
        <li>Backend: FastAPI + Supabase pgvector + OpenAI</li>
      </ul>
    </main>
  );
}
