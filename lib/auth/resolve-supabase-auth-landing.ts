type AuthLandingInput = {
  pathname: string;
  search: string;
  hash: string;
  origin: string;
};

function readAuthParams(search: string, hash: string): URLSearchParams {
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

function isRecoveryFlow(params: URLSearchParams): boolean {
  const type = params.get("type");
  if (type === "recovery") return true;

  const description = (params.get("error_description") ?? "").toLowerCase();
  return description.includes("password") || description.includes("recovery");
}

function isEmailConfirmationFlow(params: URLSearchParams): boolean {
  const type = params.get("type");
  return type === "signup" || type === "email" || type === "invite";
}

export function resolveSupabaseAuthLandingUrl(input: AuthLandingInput): string | null {
  const { pathname, search, hash, origin } = input;
  const params = readAuthParams(search, hash);

  if (pathname.startsWith("/app-recetas") && params.get("reset") === "1") {
    const login = new URL("/login", origin);
    login.searchParams.set("reset", "1");
    return login.toString();
  }

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const errorCode = params.get("error_code");
  const error = params.get("error");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type");

  if (pathname === "/auth/confirm-email" && params.get("error") === "link_expired") {
    return null;
  }

  if (tokenHash && isEmailConfirmationFlow(params) && pathname !== "/auth/confirm-email") {
    const confirm = new URL("/auth/confirm-email", origin);
    confirm.searchParams.set("token_hash", tokenHash);
    if (type) {
      confirm.searchParams.set("type", type);
    }
    const next = params.get("next");
    if (next) {
      confirm.searchParams.set("next", next);
    }
    return confirm.toString();
  }

  if (pathname === "/auth/callback" && code) {
    return null;
  }

  if (pathname === "/auth/reset-password" && params.get("error") === "link_expired") {
    return null;
  }

  if (code && pathname !== "/auth/callback" && pathname !== "/auth/reset-password" && pathname !== "/auth/confirm-email") {
    const isRecovery = type === "recovery" || isRecoveryFlow(params);

    if (isRecovery) {
      const reset = new URL("/auth/reset-password", origin);
      reset.searchParams.set("code", code);
      if (type) {
        reset.searchParams.set("type", type);
      }
      return reset.toString();
    }

    const confirm = new URL("/auth/confirm-email", origin);
    confirm.searchParams.set("code", code);
    if (type) {
      confirm.searchParams.set("type", type);
    }
    const next = params.get("next");
    if (next) {
      confirm.searchParams.set("next", next);
    }
    return confirm.toString();
  }

  if (accessToken && refreshToken && pathname !== "/auth/reset-password") {
    const reset = new URL("/auth/reset-password", origin);
    reset.hash = `access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&type=${encodeURIComponent(type ?? "recovery")}`;
    return reset.toString();
  }

  if (errorCode === "otp_expired" || error === "access_denied") {
    if (isRecoveryFlow(params)) {
      const reset = new URL("/auth/reset-password", origin);
      reset.searchParams.set("error", "link_expired");
      return reset.toString();
    }

    const confirm = new URL("/auth/confirm-email", origin);
    confirm.searchParams.set("error", "link_expired");
    return confirm.toString();
  }

  if (error === "access_denied" && errorCode) {
    const login = new URL("/login", origin);
    login.searchParams.set("mode", isRecoveryFlow(params) ? "forgot" : "signup");
    login.searchParams.set("error", errorCode);
    return login.toString();
  }

  return null;
}

export function hasSupabaseAuthLandingParams(search: string, hash: string): boolean {
  const params = readAuthParams(search, hash);
  return Boolean(
    params.get("code") ||
      params.get("token_hash") ||
      params.get("access_token") ||
      params.get("error_code") ||
      params.get("error")
  );
}
