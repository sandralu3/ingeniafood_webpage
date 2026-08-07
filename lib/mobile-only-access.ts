/**
 * Shared mobile-only access rules for IngeniaFood (PWA).
 * Used by proxy (server) and try/CTA flows (client).
 */

export const TRY_PATH = "/app";
export const DESKTOP_APP_PATH = "/desktop-app-recetas";
export const APP_PATH = "/app-recetas";
/** After install (standalone), auth lives inside the PWA shell. */
export const SIGNUP_PATH = "/login?mode=signup";
/** Mobile try/QR destination: install gate, then register inside the app. */
export const INSTALL_ENTRY_PATH = APP_PATH;

export function normalizeHostname(host: string) {
  return host.toLowerCase().split(":")[0] ?? "";
}

/** Local development hosts may open the app/auth on desktop. */
export function isLocalDevHost(hostname: string) {
  const host = normalizeHostname(hostname);
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local")
  );
}

export function isMobileUserAgent(userAgent: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    userAgent
  );
}

/**
 * Prefer the public host (ngrok / reverse proxy) over the internal bind host.
 * Behind ngrok, nextUrl.hostname is often still "localhost".
 */
export function resolvePublicHostname(input: {
  nextHostname?: string | null;
  forwardedHost?: string | null;
  hostHeader?: string | null;
}) {
  const forwarded = input.forwardedHost?.split(",")[0]?.trim();
  if (forwarded) return normalizeHostname(forwarded);

  if (input.hostHeader) return normalizeHostname(input.hostHeader);

  return normalizeHostname(input.nextHostname ?? "localhost");
}

/**
 * True when this request must not open the app/auth UI:
 * non-local host + desktop UA.
 */
export function shouldEnforceMobileOnly(hostname: string, userAgent: string) {
  if (isLocalDevHost(hostname)) return false;
  if (isMobileUserAgent(userAgent)) return false;
  return true;
}

/**
 * Auth flows that must remain usable on desktop
 * (email confirmation, password recovery, OAuth callback).
 */
export function isDesktopAuthException(
  pathname: string,
  searchParams: URLSearchParams
) {
  if (
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/callback/") ||
    pathname === "/auth/confirm-email" ||
    pathname.startsWith("/auth/confirm-email/") ||
    pathname === "/auth/reset-password" ||
    pathname.startsWith("/auth/reset-password/")
  ) {
    return true;
  }

  if (pathname === "/login" || pathname === "/auth") {
    const mode = searchParams.get("mode");
    if (searchParams.get("reset") === "1") return true;
    if (searchParams.get("verified") === "1") return true;
    if (mode === "forgot") return true;
  }

  return false;
}

export function isAppRecetasPath(pathname: string) {
  return pathname === APP_PATH || pathname.startsWith(`${APP_PATH}/`);
}

/** Public auth entry points that should show QR on desktop instead. */
export function isAuthEntryPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/auth" ||
    pathname === "/registro"
  );
}

export function buildQrImageUrl(targetUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(targetUrl)}`;
}
