function normalizeSupabaseProjectUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const normalizedPath = parsed.pathname.replace(/\/+$/, "");

    // Common misconfiguration: pasting REST endpoint instead of project base URL.
    if (normalizedPath === "/rest/v1") {
      parsed.pathname = "";
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString().replace(/\/$/, "");
    }

    return trimmed.replace(/\/$/, "");
  } catch {
    return trimmed.replace(/\/$/, "");
  }
}

export function getSupabaseProjectUrl(): string | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) return null;
  return normalizeSupabaseProjectUrl(rawUrl);
}
