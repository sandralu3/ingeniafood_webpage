import type { NextRequest } from "next/server";
import { APP_ROUTES } from "@/lib/navigation/app-routes";

/** Origen absoluto de la app (local o producción). */
export function getRequestOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (!host) {
    return "http://localhost:3000";
  }

  return `${proto}://${host}`;
}

export function buildCheckoutSuccessUrl(origin: string): string {
  return `${origin}${APP_ROUTES.scanner}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
}

export function buildCheckoutCancelUrl(origin: string): string {
  return `${origin}${APP_ROUTES.perfil}?checkout=canceled`;
}

export function buildPortalReturnUrl(origin: string): string {
  return `${origin}${APP_ROUTES.perfil}`;
}
