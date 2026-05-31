import { proxyToBrainUrl } from "@/lib/brain-proxy";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const incoming = new URL(req.url);
  const brainPath =
    path.join("/") + (incoming.search ? incoming.search : "");
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? await req.text() : undefined;
  return proxyToBrainUrl(req.method, brainPath, body);
}

export async function GET(req: Request, ctx: Ctx) {
  return handle(req, ctx);
}

export async function POST(req: Request, ctx: Ctx) {
  return handle(req, ctx);
}
