import type { NextConfig } from "next";

const defaultPublicApiUrl = "http://localhost:3040/api";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL?.trim() || defaultPublicApiUrl,
    INTERNAL_API_URL:
      process.env.INTERNAL_API_URL?.trim() || defaultPublicApiUrl,
  },
};

export default nextConfig;
