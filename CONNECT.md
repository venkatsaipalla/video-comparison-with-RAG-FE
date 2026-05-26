# Frontend ↔ brain API

## Env

Root `.env` (not `.env.local` unless you intentionally override):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Restart the dev server after changing this. If both `.env` and `.env.local` exist, Next.js prefers `.env.local`.

The browser calls `/api/brain/*` on the Next dev server (same origin). Route handlers in `src/app/api/brain/` proxy server-side to `NEXT_PUBLIC_API_URL` (avoids CORS and gives clearer errors than rewrites).

`NEXT_PUBLIC_API_TIMEOUT_SEC` — client timeout for `/init` and `/chat` (e.g. `120`). `/health` warmup is not limited.

## API mapping

| UI action | Brain endpoint | Notes |
|-----------|----------------|--------|
| Analyze & compare | `POST /init` | `{ user_id, urls: [urlA, urlB] }` — blocks until GPU ingest finishes |
| Chat send | `POST /chat` | `{ user_id, session_id, message }` → `{ answer, state }` |
| Health | `GET /health` | — |

`user_id` is a stable UUID in `localStorage` (`src/lib/user.ts`).

Session titles/URLs are stored in `sessionStorage` after `/init` so the session page can render video cards without a separate status API.

## Run

```bash
# Terminal 1 — brain (repo: BE-video-comparison-rag copy)
python main.py
# or: uvicorn main:app --reload --port 8000

# Terminal 2 — GPU retrieval service (RETRIEVAL_BASE_URL, default :9000)

# Terminal 3 — frontend
npm run dev
```

Open http://localhost:3000
