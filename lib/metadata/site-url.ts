/** Origen absoluto para metadata, Open Graph y URLs de checkout. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return process.env.NODE_ENV === "production"
    ? "https://ingeniafood.es"
    : "http://localhost:3000";
}

export const METADATA_BASE = new URL(getSiteUrl());
