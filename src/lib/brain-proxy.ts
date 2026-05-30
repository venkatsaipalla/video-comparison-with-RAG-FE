import { getApiTimeoutMs, getBackendApiUrl } from "@/lib/env";

/** Server-only — same value as Render `BACKEND_API_KEY`. */
function brainRequestHeaders(hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {};
  if (hasBody) headers["Content-Type"] = "application/json";
  const apiKey = process.env.BRAIN_API_KEY?.trim();
  if (apiKey) headers["X-API-Key"] = apiKey;
  return headers;
}

/**
 * Proxy any brain path: `/api/brain/foo` → `{NEXT_PUBLIC_API_URL}/foo`
 * `brainPath` may include query string.
 */
export async function proxyToBrainUrl(
  method: string,
  brainPath: string,
  body?: string
): Promise<Response> {
  const base = getBackendApiUrl();
  const url = `${base}/${brainPath.replace(/^\//, "")}`;
  const timeoutMs = getApiTimeoutMs() ?? 120_000;
  const hasBody = body !== undefined && method !== "GET" && method !== "HEAD";

  try {
    const res = await fetch(url, {
      method,
      headers: brainRequestHeaders(hasBody),
      body: hasBody ? body : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    const timedOut =
      e instanceof Error &&
      (e.name === "TimeoutError" || e.name === "AbortError");
    return Response.json(
      {
        detail: timedOut
          ? `Brain API timed out after ${Math.round(timeoutMs / 1000)}s (${url})`
          : `Brain API unreachable at ${url}: ${reason}`,
      },
      { status: timedOut ? 504 : 502 }
    );
  }
}
