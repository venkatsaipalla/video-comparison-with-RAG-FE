import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

import { getBackendApiUrl } from "./src/lib/env";

// Load `.env` before reading NEXT_PUBLIC_API_URL for rewrites and the client bundle.
loadEnvConfig(process.cwd());

const backendUrl = getBackendApiUrl();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: backendUrl,
    NEXT_PUBLIC_API_TIMEOUT_SEC: process.env.NEXT_PUBLIC_API_TIMEOUT_SEC ?? "",
    NEXT_PUBLIC_API_TIMEOUT_MS: process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? "",
  },
};

export default nextConfig;
