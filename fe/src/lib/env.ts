/** URL API untuk browser. Harus akses `process.env.NEXT_PUBLIC_API_URL` secara statis — `process.env[name]` tidak di-inline ke bundle client. */
export function getPublicApiUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is required. Set it in fe/.env.local or fe/.env.development (see fe/.env.example), or next.config.ts env default.",
    );
  }
  return value;
}

/** URL API untuk Server Components / server actions di Docker. */
export function getServerApiUrl(): string {
  return process.env.INTERNAL_API_URL?.trim() || getPublicApiUrl();
}
