import {
  TRY_PATH,
  SIGNUP_PATH,
  INSTALL_ENTRY_PATH,
  isLocalDevHost,
  buildQrImageUrl as buildQrImageUrlShared
} from "@/lib/mobile-only-access";

export { TRY_PATH, SIGNUP_PATH, INSTALL_ENTRY_PATH };
export { buildQrImageUrlShared as buildQrImageUrl };

const DESKTOP_MIN_WIDTH = 768;

export function isDesktopViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches;
}

export function getClientHostname() {
  if (typeof window === "undefined") return "localhost";
  return window.location.hostname;
}

export function isClientLocalDevHost() {
  return isLocalDevHost(getClientHostname());
}

/** Large screens outside localhost must use the QR flow. */
export function shouldEnforceMobileQr() {
  return isDesktopViewport() && !isClientLocalDevHost();
}

export function buildAbsoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}
