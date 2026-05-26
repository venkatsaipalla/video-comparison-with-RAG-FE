const DEFAULT_BACKEND_URL = "http://localhost:8000";

/** Brain API origin from `.env` → `NEXT_PUBLIC_API_URL` (no trailing slash). */
export function getBackendApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw?.trim()) return DEFAULT_BACKEND_URL;
  return raw.trim().replace(/\/$/, "");
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

/**
 * Request timeout for `/init` and `/chat` in milliseconds.
 * Set `NEXT_PUBLIC_API_TIMEOUT_SEC` in `.env` (e.g. `120` for 2 minutes).
 * Returns `undefined` when unset (no explicit client timeout).
 */
export function getApiTimeoutMs(): number | undefined {
  const secRaw = process.env.NEXT_PUBLIC_API_TIMEOUT_SEC;
  if (secRaw?.trim()) {
    const sec = Number(secRaw);
    if (Number.isFinite(sec) && sec > 0) return Math.round(sec * 1000);
  }
  const msRaw = process.env.NEXT_PUBLIC_API_TIMEOUT_MS;
  if (msRaw?.trim()) {
    const ms = Number(msRaw);
    if (Number.isFinite(ms) && ms > 0) return Math.round(ms);
  }
  return undefined;
}
