import { getServerProxyTimeoutMs } from "@/lib/env";
import { proxyToBrainUrl } from "@/lib/brain-proxy";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
/** Vercel route max duration (seconds). Keep in sync with BRAIN_PROXY_TIMEOUT_SEC. */
export const maxDuration = 240;

/** Dedicated POST /chat proxy — avoids the catch-all `/api/brain/*` router. */
export async function POST(req: Request) {
  const body = await req.text();
  const timeoutMs = getServerProxyTimeoutMs();
  return proxyToBrainUrl("POST", "chat", body, timeoutMs);
}
