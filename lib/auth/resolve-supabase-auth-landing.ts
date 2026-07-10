import { APP_ROUTES } from "@/lib/navigation/app-routes";

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

export function resolveSupabaseAuthLandingUrl(input: AuthLandingInput): string | null {
  const { pathname, search, hash, origin } = input;
  const params = readAuthParams(search, hash);

  if (pathname.startsWith("/app-recetas") && params.get("reset") === "1") {
    const login = new URL("/login", origin);
    login.searchParams.set("reset", "1");
    return login.toString();
  }

  const code = params.get("code");
  const errorCode = params.get("error_code");
  const error = params.get("error");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type");

  if (pathname === "/auth/callback" && code) {
    return null;
  }

  if (pathname === "/auth/reset-password" && params.get("error") === "link_expired") {
    return null;
  }

  if (code && pathname !== "/auth/callback" && pathname !== "/auth/reset-password") {
    const isRecovery = type === "recovery" || isRecoveryFlow(params);

    if (isRecovery) {
      const reset = new URL("/auth/reset-password", origin);
      reset.searchParams.set("code", code);
      if (type) {
        reset.searchParams.set("type", type);
      }
      return reset.toString();
    }

    const callback = new URL("/auth/callback", origin);
    callback.searchParams.set("code", code);

    if (type) {
      callback.searchParams.set("type", type);
    }

    const nextPath =
      type === "recovery" || isRecoveryFlow(params) ? "/auth/reset-password" : APP_ROUTES.hoy;

    callback.searchParams.set("next", nextPath);
    return callback.toString();
  }

  if (accessToken && refreshToken && pathname !== "/auth/reset-password") {
    const reset = new URL("/auth/reset-password", origin);
    reset.hash = `access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&type=${encodeURIComponent(type ?? "recovery")}`;
    return reset.toString();
  }

  if (errorCode === "otp_expired" || (error === "access_denied" && isRecoveryFlow(params))) {
    const reset = new URL("/auth/reset-password", origin);
    reset.searchParams.set("error", "link_expired");
    return reset.toString();
  }

  if (error === "access_denied" && errorCode) {
    const login = new URL("/login", origin);
    login.searchParams.set("mode", "forgot");
    login.searchParams.set("error", errorCode);
    return login.toString();
  }

  return null;
}

export function hasSupabaseAuthLandingParams(search: string, hash: string): boolean {
  const params = readAuthParams(search, hash);
  return Boolean(
    params.get("code") ||
      params.get("access_token") ||
      params.get("error_code") ||
      params.get("error")
  );
}
