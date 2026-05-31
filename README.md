# Creatorjoy — Video Comparison RAG (Frontend)

Next.js app for comparing **two YouTube videos** side-by-side and chatting with a **cited AI assistant** grounded in transcript retrieval.

Pair with the backend repo: **`BE-video-comparison-rag`** (FastAPI + Postgres + ADK agents).

---

## What you can do

- Sign in with **Google**
- Paste two **YouTube / YouTube Shorts** URLs and run GPU ingest
- View **video metrics**, embedded players, and comparison status
- **Chat** with suggested prompts or your own questions
- Expand **RAG sources** (retrieved transcript chunks) under each answer
- **Dictate** questions with the mic button (Chrome / Edge / Safari)
- Browse **history** in the sidebar; open or delete past comparisons

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 18+** | For Next.js |
| **Backend running** | `BE-video-comparison-rag` on port `8000` (or your tunnel URL) |
| **GPU retrieval service** | Backend `RETRIEVAL_BASE_URL` (default `:9000`) |
| **Google OAuth client** | Same client ID as backend; redirect URI below |
| **Postgres** | Backend migrations applied (users, comparisons, messages) |

---

## Quick start (local)

### 1. Clone and install

```bash
cd FE-video-comparison-rag
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Where the brain API lives (browser + fallback)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Server proxy target — use dev tunnel URL if backend is tunneled
BACKEND_API_URL=http://localhost:8000

# Must match brain repo BACKEND_API_KEY
BRAIN_API_KEY=your-backend-api-key

# Google OAuth (Console → same client as backend GOOGLE_CLIENT_ID)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# NextAuth secret: openssl rand -base64 32
AUTH_SECRET=...

# Timeouts (seconds) — chat can take 1–4+ minutes
NEXT_PUBLIC_API_TIMEOUT_SEC=240
BRAIN_PROXY_TIMEOUT_SEC=240
```

**Dev tunnel:** If the backend is exposed via `devtunnels.ms`, set `BACKEND_API_URL` to the tunnel URL. Keep `NEXT_PUBLIC_API_URL` as `http://localhost:8000` unless the browser must hit the tunnel directly.

**Important:** No spaces around `=` in `.env` (e.g. `AUTH_SECRET=abc`, not `AUTH_SECRET = abc`).

### 3. Google OAuth redirect URIs

In [Google Cloud Console](https://console.cloud.google.com/) → your OAuth client → **Authorized redirect URIs**:

```
http://localhost:3000/api/auth/callback/google
https://your-production-domain.vercel.app/api/auth/callback/google
```

### 4. Start the backend stack

```bash
# Terminal 1 — brain API
cd ../BE-video-comparison-rag
python main.py

# Terminal 2 — GPU retrieval (if separate)
# See backend README
```

### 5. Start the frontend

```bash
# Terminal 3
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** → sign in → paste two YouTube URLs → **Analyze & compare**.

Restart `npm run dev` after any `.env` change.

---

## How to use the app

### Sign in

1. Go to `/login`
2. Click **Continue with Google**
3. On first sign-in, the backend upserts your user via `POST /auth/google`

### New comparison

1. From the home page (`/`), paste **Video A** and **Video B** URLs (YouTube or Shorts)
2. Click **Analyze & compare**
3. Ingest takes **1–3 minutes** — progress shows under the button; sidebar stays usable
4. You are redirected to `/c/{comparison-id}` when ready

### Chat

1. On the comparison page, use **suggested prompt chips** or type in the input
2. Optional: click the **mic** to dictate (Web Speech API)
3. Click **Send** — the assistant reply appears with expandable **Sources · N retrieved chunks**
4. History saves automatically; sidebar updates after each turn

### History

- Left sidebar lists past comparisons (newest first)
- Click a row to reopen `/c/{id}`
- Hover a row → **×** to delete, or use **Delete** on the comparison page

---

## API routing (how the FE talks to the brain)

The browser does **not** call the brain API directly for most actions. Requests go through Next.js:

| UI action | Frontend call | Server forwards to |
|-----------|---------------|-------------------|
| **Chat send** | `POST /api/chat` | `{BACKEND_API_URL}/chat` |
| **New comparison** | `POST /api/brain/init` | `{BACKEND_API_URL}/init` |
| **History / detail** | `GET /api/brain/users/.../comparisons` | same path on brain |
| **Health warmup** | `GET /api/brain/health` | `{BACKEND_API_URL}/health` |

Chat uses a **dedicated** `/api/chat` route (not the catch-all `/api/brain/*`) so long agent runs are less likely to stall.

### Timeouts

| Variable | Controls |
|----------|----------|
| `BRAIN_PROXY_TIMEOUT_SEC` | Server `/api/chat` → backend (set this for chat) |
| `NEXT_PUBLIC_API_TIMEOUT_SEC` | Browser wait on `/api/chat` and `/init` |

Set both to the same value (e.g. `240` = 4 minutes). On **504** errors, the JSON body includes how many seconds were used.

---

## Project scripts

```bash
npm run dev      # Development server (localhost:3000)
npm run build    # Production build
npm run start    # Run production build
npm run lint     # ESLint
```

---

## Deploy (Vercel)

1. Push this repo to GitHub and import in [Vercel](https://vercel.com) (Framework: **Next.js**).
2. Set environment variables:

   | Variable | Example |
   |----------|---------|
   | `NEXT_PUBLIC_API_URL` | `https://your-brain.onrender.com` |
   | `BACKEND_API_URL` | same as above |
   | `BRAIN_API_KEY` | same as Render `BACKEND_API_KEY` |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth client |
   | `AUTH_SECRET` | random 32+ char secret |
   | `NEXT_PUBLIC_API_TIMEOUT_SEC` | `240` |
   | `BRAIN_PROXY_TIMEOUT_SEC` | `240` |

3. Add your Vercel URL to backend **`CORS_ORIGINS`**.
4. Add production Google redirect URI (see above).
5. Deploy.

See `DEPLOY.md` for a short checklist.

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| **504 on chat** | Raise `BRAIN_PROXY_TIMEOUT_SEC` and `NEXT_PUBLIC_API_TIMEOUT_SEC`; ensure backend is up |
| **Chat pending, backend never hit** | Check `BACKEND_API_URL`; restart `npm run dev` |
| **401 on API** | `BRAIN_API_KEY` must match backend `BACKEND_API_KEY` |
| **redirect_uri_mismatch** | Add exact callback URL in Google Console |
| **Comparison not found** | Wrong user/comparison; refresh sidebar; re-open from history |
| **Mic missing** | Use Chrome/Edge/Safari (Firefox has no Speech Recognition) |
| **ClientFetchError / auth** | Restart dev server; fix `AUTH_SECRET` formatting |

---

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **NextAuth v5** (Google provider)
- **react-markdown** for assistant replies
- Deploy target: **Vercel** (UI) + **Render / local** (brain API)

---

## Related docs

- `CONNECT.md` — FE ↔ brain API wiring
- `DEPLOY.md` — Vercel deploy checklist
- `LOOM.md` — demo script notes
- Backend `README.md` — agents, ingest, Postgres schema
