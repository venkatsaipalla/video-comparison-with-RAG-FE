# Frontend ↔ brain API

## Env

`.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

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
