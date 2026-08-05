/** Persistencia local del soft prompt de push en Hoy. */

const STORAGE_KEY = "ingeniafood:push-opt-in-dismissed-until";

/** 10 días entre avisos en Hoy tras “Ahora no”. */
export const PUSH_OPT_IN_DISMISS_MS = 10 * 24 * 60 * 60 * 1000;

export function isPushOptInDismissed(now = Date.now()): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    return until > now;
  } catch {
    return false;
  }
}

export function dismissPushOptIn(durationMs = PUSH_OPT_IN_DISMISS_MS): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now() + durationMs));
  } catch {
    // ignore quota / private mode
  }
}

export function clearPushOptInDismiss(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
