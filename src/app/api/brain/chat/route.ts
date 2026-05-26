import { proxyToBrain } from "@/lib/brain-proxy";

export async function POST(req: Request) {
  return proxyToBrain(req, "chat");
}
