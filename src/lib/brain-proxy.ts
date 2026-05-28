import { getApiTimeoutMs, getBrainEndpointUrl } from "@/lib/env";

type BrainEndpoint = "chat" | "init" | "health";

/** Server-only — same value as Render `BACKEND_API_KEY`. Never use NEXT_PUBLIC_. */
function brainRequestHeaders(hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {};
  if (hasBody) headers["Content-Type"] = "application/json";
  const apiKey = process.env.BRAIN_API_KEY?.trim();
  if (apiKey) headers["X-API-Key"] = apiKey;
  return headers;
}

/**
 * Server-side proxy: browser → `/api/brain/{endpoint}` →
 * `{NEXT_PUBLIC_API_URL}/{endpoint}` (e.g. `…/chat`).
 */
export async function proxyToBrain(
  req: Request,
  endpoint: BrainEndpoint
): Promise<Response> {
  const url = getBrainEndpointUrl(endpoint);
  const timeoutMs = getApiTimeoutMs() ?? 120_000;
  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  try {
    const res = await fetch(url, {
      method: req.method,
      headers: brainRequestHeaders(hasBody),
      body: hasBody ? await req.text() : undefined,
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
