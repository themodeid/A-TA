export function getPublicApiUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is required. Set it in fe/.env.local or fe/.env (see fe/.env.example), or next.config.ts env default.",
    );
  }
  return value;
}

export function getServerApiUrl(): string {
  return process.env.INTERNAL_API_URL?.trim() || getPublicApiUrl();
}
