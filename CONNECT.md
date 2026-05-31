# Frontend ↔ brain API

## Env

Root `.env` (not `.env.local` unless you intentionally override):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
BACKEND_API_URL=http://localhost:8000
BRAIN_API_KEY=<same as brain BACKEND_API_KEY>
```

**Chat** uses a dedicated same-origin route `POST /api/chat` (not the catch-all `/api/brain/*`). Next.js forwards server-side to `BACKEND_API_URL`. History, init, and comparisons use `/api/brain/*`.

Restart the dev server after changing `.env`.

`NEXT_PUBLIC_API_TIMEOUT_SEC` — client timeout for `/init` and `/chat` (e.g. `120`). `/health` warmup is not limited.

## API mapping

| UI action | Brain endpoint | Notes |
|-----------|----------------|--------|
| Analyze & compare | `POST /init` | `{ user_id, urls: [urlA, urlB] }` — blocks until GPU ingest finishes |
| Chat send | `POST /api/chat` → `BACKEND_API_URL/chat` | Dedicated route (not `/api/brain/*`) |
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
