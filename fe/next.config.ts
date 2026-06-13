import type { NextConfig } from "next";

/** Selaras dengan root `.env.example` (BACKEND_PORT=3020, API_KONTAK_PATH). */
const defaultPublicApiUrl = "http://localhost:3020/api/kontak";

const nextConfig: NextConfig = {
  // Turbopack disabled due to memory issues in Docker
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL?.trim() || defaultPublicApiUrl,
  },
};

export default nextConfig;
