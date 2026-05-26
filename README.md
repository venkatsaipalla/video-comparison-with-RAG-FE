# Creatorjoy Video Comparison RAG — Frontend

Next.js UI for comparing two social videos with **side-by-side metrics** and **streaming cited AI chat**.

Backend repo: `BE-video-comparison-rag` (FastAPI + Supabase pgvector).

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Deploy: **Vercel**
- API: FastAPI backend (not on Vercel — long ingest + Python)

## Setup

```bash
cp .env.example .env
# Edit NEXT_PUBLIC_API_URL in .env (brain API URL)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Ensure the backend is running and Supabase migration is applied.

## Deploy (Vercel)

1. Import this repo in Vercel.
2. Environment variable: `NEXT_PUBLIC_API_URL=https://your-api.onrender.com`
3. Add the Vercel URL to backend `CORS_ORIGINS`.

## Features

- Two URL inputs (YouTube, Shorts, TikTok, Instagram Reels)
- Ingest polling with per-video status and engagement rates
- Embedded YouTube player where supported; thumbnail + link otherwise
- Streaming chat with markdown and citation chips
- Suggested prompts for screening demo

## Loom checklist

- [ ] Real Video A (YouTube) + Video B (TikTok or Reel)
- [ ] Wait for `ready` status
- [ ] Three chat questions with visible citations
- [ ] Mention architecture trade-offs (see backend README)
