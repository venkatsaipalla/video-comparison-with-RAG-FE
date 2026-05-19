# Frontend deployment (Vercel)

1. Push `FE-video-comparison-by-rag` to GitHub.
2. Import in [Vercel](https://vercel.com) → Framework: Next.js.
3. Environment variable:
   - `NEXT_PUBLIC_API_URL` = your deployed FastAPI URL (Render/Fly).
4. Deploy.

Update backend `CORS_ORIGINS` to include your Vercel production URL.

Local: `npm run dev` with `NEXT_PUBLIC_API_URL=http://localhost:8000`.
