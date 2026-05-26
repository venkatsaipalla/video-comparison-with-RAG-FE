import { proxyToBrain } from "@/lib/brain-proxy";

export async function GET(req: Request) {
  return proxyToBrain(req, "health");
}
