const REFERRAL_STORAGE_KEY = "ingeniafood_referral_code";

export function stashReferralCodeFromUrl(search: string): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(search);
  const code = params.get("ref")?.trim().toUpperCase() || null;
  if (code) {
    try {
      localStorage.setItem(REFERRAL_STORAGE_KEY, code);
    } catch {
      // ignore
    }
  }
  return code;
}

export function readStashedReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(REFERRAL_STORAGE_KEY)?.trim().toUpperCase() || null;
  } catch {
    return null;
  }
}

export function clearStashedReferralCode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function buildReferralInviteUrl(origin: string, referralCode: string): string {
  const url = new URL("/", origin);
  url.searchParams.set("ref", referralCode);
  return url.toString();
}
