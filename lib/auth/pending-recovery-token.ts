const PENDING_RECOVERY_STORAGE_KEY = "ingeniafood_pending_recovery_v1";

export type PendingRecoveryToken = {
  tokenHash: string | null;
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
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

export function readRecoveryParamsFromLocation(
  search: string,
  hash: string
): PendingRecoveryToken {
  const params = readParams(search, hash);

  return {
    tokenHash: params.get("token_hash"),
    code: params.get("code"),
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    type: params.get("type")
  };
}

export function hasRecoveryCredential(token: PendingRecoveryToken | null | undefined): token is PendingRecoveryToken {
  if (!token) return false;

  return Boolean(
    token.tokenHash ||
      token.code ||
      (token.accessToken && token.refreshToken)
  );
}

export function mergeRecoveryTokens(
  current: PendingRecoveryToken | null,
  incoming: PendingRecoveryToken
): PendingRecoveryToken {
  return {
    tokenHash: incoming.tokenHash ?? current?.tokenHash ?? null,
    code: incoming.code ?? current?.code ?? null,
    accessToken: incoming.accessToken ?? current?.accessToken ?? null,
    refreshToken: incoming.refreshToken ?? current?.refreshToken ?? null,
    type: incoming.type ?? current?.type ?? null
  };
}

export function persistPendingRecovery(token: PendingRecoveryToken): void {
  if (typeof window === "undefined" || !hasRecoveryCredential(token)) return;
  sessionStorage.setItem(PENDING_RECOVERY_STORAGE_KEY, JSON.stringify(token));
}

export function readPendingRecovery(): PendingRecoveryToken | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(PENDING_RECOVERY_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingRecoveryToken;
    return hasRecoveryCredential(parsed) ? parsed : null;
  } catch {
    sessionStorage.removeItem(PENDING_RECOVERY_STORAGE_KEY);
    return null;
  }
}

export function clearPendingRecovery(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_RECOVERY_STORAGE_KEY);
}

export function cleanRecoveryParamsFromUrl(): void {
  if (typeof window === "undefined") return;

  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete("code");
  cleanUrl.searchParams.delete("token_hash");
  cleanUrl.searchParams.delete("type");
  cleanUrl.hash = "";

  window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}`);
}
