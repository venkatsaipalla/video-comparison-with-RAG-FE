const DEFAULT_BACKEND_URL = "http://localhost:8000";

/** Brain API origin from `.env` → `NEXT_PUBLIC_API_URL` (no trailing slash). */
export function getBackendApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw?.trim()) return DEFAULT_BACKEND_URL;
  return raw.trim().replace(/\/$/, "");
}

/**
 * Target for Next.js API proxies (`/api/chat`, `/api/brain/*`).
 * Uses `BACKEND_API_URL` from `.env` (e.g. dev tunnel).
 */
export function getServerBackendApiUrl(): string {
  const direct = process.env.BACKEND_API_URL?.trim();
  if (direct) return direct.replace(/\/$/, "");
  return getBackendApiUrl();
}

/** Full brain URL: `{NEXT_PUBLIC_API_URL}/chat` | `/init` | `/health` */
export function getBrainEndpointUrl(
  endpoint: "chat" | "init" | "health"
): string {
  return `${getBackendApiUrl()}/${endpoint}`;
}

/**
 * Base path for browser `fetch` calls. Same-origin proxy avoids CORS preflight
 * hangs (common with dev tunnels on the first cross-origin POST).
 */
export function getApiBaseUrl(): string {
  return "/api/brain";
}

function readTimeoutSecFromEnv(...keys: string[]): number | undefined {
  for (const key of keys) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;
    const sec = Number(raw);
    if (Number.isFinite(sec) && sec > 0) return Math.round(sec);
  }
  return undefined;
}

/**
 * Client-side timeout (browser bundle). Set `NEXT_PUBLIC_API_TIMEOUT_SEC`.
 */
export function getApiTimeoutMs(): number | undefined {
  const sec = readTimeoutSecFromEnv(
    "NEXT_PUBLIC_API_TIMEOUT_SEC",
    "API_TIMEOUT_SEC"
  );
  if (sec) return sec * 1000;

  const msRaw = process.env.NEXT_PUBLIC_API_TIMEOUT_MS?.trim();
  if (msRaw) {
    const ms = Number(msRaw);
    if (Number.isFinite(ms) && ms > 0) return Math.round(ms);
  }
  return undefined;
}

/**
 * Server-side proxy timeout for `/api/chat` and `/api/brain/*`.
 * Prefer `BRAIN_PROXY_TIMEOUT_SEC` — `NEXT_PUBLIC_*` is not always available
 * at runtime inside App Router route handlers.
 */
export function getServerProxyTimeoutMs(): number {
  const sec = readTimeoutSecFromEnv(
    "BRAIN_PROXY_TIMEOUT_SEC",
    "API_TIMEOUT_SEC",
    "NEXT_PUBLIC_API_TIMEOUT_SEC"
  );
  return (sec ?? 240) * 1000;
}

/** Client `/api/chat` wait time — defaults to 4 minutes. */
export function getClientChatTimeoutMs(): number {
  return getApiTimeoutMs() ?? 240_000;
}
