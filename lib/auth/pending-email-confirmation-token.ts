import { APP_ROUTES } from "@/lib/navigation/app-routes";

const PENDING_EMAIL_CONFIRMATION_STORAGE_KEY = "ingeniafood_pending_email_confirmation_v1";

export type PendingEmailConfirmationToken = {
  tokenHash: string | null;
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
  nextPath: string | null;
};

function readParams(search: string, hash: string): URLSearchParams {
  const query = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const merged = new URLSearchParams();

  query.forEach((value, key) => merged.set(key, value));
  hashParams.forEach((value, key) => {
    if (!merged.has(key)) {
      merged.set(key, value);
    }
  });

  return merged;
}

function resolveNextPath(next: string | null): string | null {
  if (!next) return null;
  if (next.startsWith("/app-recetas")) return next;
  if (next === APP_ROUTES.hoy || next.startsWith(`${APP_ROUTES.hoy}/`)) return next;
  return null;
}

export function readEmailConfirmationParamsFromLocation(
  search: string,
  hash: string
): PendingEmailConfirmationToken {
  const params = readParams(search, hash);

  return {
    tokenHash: params.get("token_hash"),
    code: params.get("code"),
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    type: params.get("type"),
    nextPath: resolveNextPath(params.get("next"))
  };
}

export function hasEmailConfirmationCredential(
  token: PendingEmailConfirmationToken | null | undefined
): boolean {
  if (!token) return false;

  return Boolean(
    token.tokenHash ||
      token.code ||
      (token.accessToken && token.refreshToken)
  );
}

export function mergeEmailConfirmationTokens(
  current: PendingEmailConfirmationToken | null,
  incoming: PendingEmailConfirmationToken
): PendingEmailConfirmationToken {
  return {
    tokenHash: incoming.tokenHash ?? current?.tokenHash ?? null,
    code: incoming.code ?? current?.code ?? null,
    accessToken: incoming.accessToken ?? current?.accessToken ?? null,
    refreshToken: incoming.refreshToken ?? current?.refreshToken ?? null,
    type: incoming.type ?? current?.type ?? null,
    nextPath: incoming.nextPath ?? current?.nextPath ?? null
  };
}

export function persistPendingEmailConfirmation(token: PendingEmailConfirmationToken): void {
  if (typeof window === "undefined" || !hasEmailConfirmationCredential(token)) return;
  sessionStorage.setItem(PENDING_EMAIL_CONFIRMATION_STORAGE_KEY, JSON.stringify(token));
}

export function readPendingEmailConfirmation(): PendingEmailConfirmationToken | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(PENDING_EMAIL_CONFIRMATION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingEmailConfirmationToken;
    return hasEmailConfirmationCredential(parsed) ? parsed : null;
  } catch {
    sessionStorage.removeItem(PENDING_EMAIL_CONFIRMATION_STORAGE_KEY);
    return null;
  }
}

export function clearPendingEmailConfirmation(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_EMAIL_CONFIRMATION_STORAGE_KEY);
}

export function cleanEmailConfirmationParamsFromUrl(): void {
  if (typeof window === "undefined") return;

  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete("code");
  cleanUrl.searchParams.delete("token_hash");
  cleanUrl.searchParams.delete("type");
  cleanUrl.searchParams.delete("next");
  cleanUrl.hash = "";

  window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}`);
}

export function resolveEmailConfirmationDestination(nextPath: string | null): string {
  return nextPath ?? APP_ROUTES.hoy;
}
