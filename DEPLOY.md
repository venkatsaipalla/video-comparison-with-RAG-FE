# Frontend deployment (Vercel)

1. Push `FE-video-comparison-by-rag` to GitHub.
2. Import in [Vercel](https://vercel.com) → Framework: Next.js.
3. Environment variables:
   - `NEXT_PUBLIC_API_URL` = your Render brain URL (e.g. `https://video-rag-brain.onrender.com`)
   - `BRAIN_API_KEY` = same as Render `BACKEND_API_KEY` (server-only, not `NEXT_PUBLIC_`)
   - `NEXT_PUBLIC_API_TIMEOUT_SEC` = `300` (or higher for slow `/init`)
4. Deploy.

Set brain `CORS_ORIGINS` to include your Vercel production URL.

Local: `npm run dev` with `NEXT_PUBLIC_API_URL=http://localhost:8000`.
