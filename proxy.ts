/**
 * Proxy (Next.js 16; equivalente a middleware.ts):
 * - Auth / acceso PWA a /app-recetas
 * - Mobile-only: en hosts no locales, escritorio no abre app ni signup (QR)
 * - Entry points localizados /es y /en → set cookie NEXT_LOCALE + redirect sin prefijo
 * - Si no hay cookie, fija idioma desde Accept-Language
 *
 * No usamos createMiddleware de next-intl con localePrefix en todas las rutas
 * para no romper APP_ROUTES (/app-recetas) ni deep links de la PWA.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { getSupabaseProjectUrl } from "@/lib/supabaseConfig";
import {
  DEFAULT_LOCALE,
  isAppLocale,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  type AppLocale
} from "@/i18n/config";
import { negotiateLocaleFromAcceptLanguage } from "@/lib/i18n/negotiate-locale";
import {
  APP_PATH,
  DESKTOP_APP_PATH,
  TRY_PATH,
  isAppRecetasPath,
  isAuthEntryPath,
  isDesktopAuthException,
  isLocalDevHost,
  isMobileUserAgent,
  resolvePublicHostname,
  shouldEnforceMobileOnly
} from "@/lib/mobile-only-access";

function setLocaleCookie(response: NextResponse, locale: AppLocale) {
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax"
  });
}

const PUBLIC_ROUTES = new Set([
  "/",
  "/oliva",
  "/auth",
  "/auth/callback",
  "/auth/confirm-email",
  "/auth/reset-password",
  "/login",
  "/registro",
  "/app",
  "/app-recetas",
  "/desktop-app-recetas",
  "/descargar-app"
]);
const APP_ACCESS_COOKIE = "ingeniafood_app_access";
const APP_ACCESS_QUERY_KEY = "k";

export async function proxy(request: NextRequest) {
  const { pathname, protocol } = request.nextUrl;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const userAgent = request.headers.get("user-agent") ?? "";
  const isMobile = isMobileUserAgent(userAgent);
  const hostname = resolvePublicHostname({
    nextHostname: request.nextUrl.hostname,
    forwardedHost: request.headers.get("x-forwarded-host"),
    hostHeader: request.headers.get("host")
  });
  const enforceMobileOnly = shouldEnforceMobileOnly(hostname, userAgent);

  // Refuerzo: en producción forzar HTTPS para cumplir requisitos PWA en móviles.
  if (
    process.env.NODE_ENV === "production" &&
    protocol === "http:" &&
    forwardedProto !== "https"
  ) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 308);
  }

  // No redirigir ni proteger APIs aquí; cada endpoint maneja su auth/errores JSON.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // /es|/en|/fr|/pt|/de → cookie + ruta canónica sin prefijo.
  const localePathMatch = pathname.match(/^\/(es|en|fr|pt|de)(\/.*)?$/);
  if (localePathMatch) {
    const locale = localePathMatch[1] as AppLocale;
    const rest =
      localePathMatch[2] && localePathMatch[2].length > 0
        ? localePathMatch[2]
        : "/";
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = rest;
    const redirectResponse = NextResponse.redirect(targetUrl);
    setLocaleCookie(redirectResponse, locale);
    return redirectResponse;
  }

  // ── Mobile-only gates (ngrok / production desktop) ──
  if (enforceMobileOnly) {
    // Direct app URLs → QR page
    if (isAppRecetasPath(pathname)) {
      const blocked = request.nextUrl.clone();
      blocked.pathname = DESKTOP_APP_PATH;
      blocked.search = "";
      return NextResponse.redirect(blocked);
    }

    // Legacy app-adjacent routes
    if (
      pathname === "/scanner" ||
      pathname.startsWith("/scanner/") ||
      pathname === "/recipes" ||
      pathname.startsWith("/recipes/") ||
      pathname === "/profile" ||
      pathname.startsWith("/profile/") ||
      pathname === "/test-premium" ||
      pathname.startsWith("/test-premium/")
    ) {
      const blocked = request.nextUrl.clone();
      blocked.pathname = DESKTOP_APP_PATH;
      blocked.search = "";
      return NextResponse.redirect(blocked);
    }

    // Login / auth / registro → /app (QR). Keep recovery & confirm flows.
    if (
      isAuthEntryPath(pathname) &&
      !isDesktopAuthException(pathname, request.nextUrl.searchParams)
    ) {
      const tryUrl = request.nextUrl.clone();
      tryUrl.pathname = TRY_PATH;
      tryUrl.search = "";
      return NextResponse.redirect(tryUrl);
    }
  }

  const isProtectedAppRoute =
    isAppRecetasPath(pathname) ||
    pathname === DESKTOP_APP_PATH ||
    pathname.startsWith(`${DESKTOP_APP_PATH}/`);

  // En producción, solo permite acceso a la app con enlace secreto.
  if (process.env.NODE_ENV === "production" && isProtectedAppRoute) {
    const secretKey = process.env.APP_PRIVATE_ACCESS_KEY?.trim();
    if (!secretKey) {
      const blockedUrl = request.nextUrl.clone();
      blockedUrl.pathname = "/";
      blockedUrl.search = "";
      return NextResponse.redirect(blockedUrl);
    }

    const accessCookie = request.cookies.get(APP_ACCESS_COOKIE)?.value === "1";
    const providedKey = request.nextUrl.searchParams.get(APP_ACCESS_QUERY_KEY);

    if (!accessCookie) {
      if (providedKey !== secretKey) {
        const blockedUrl = request.nextUrl.clone();
        blockedUrl.pathname = "/";
        blockedUrl.search = "";
        return NextResponse.redirect(blockedUrl);
      }

      const cleanUrl = request.nextUrl.clone();
      cleanUrl.searchParams.delete(APP_ACCESS_QUERY_KEY);
      const accessResponse = NextResponse.redirect(cleanUrl);
      accessResponse.cookies.set(APP_ACCESS_COOKIE, "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 30
      });
      return accessResponse;
    }
  }

  if (pathname === "/descargar-app") {
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname =
      isMobile || isLocalDevHost(hostname) ? APP_PATH : DESKTOP_APP_PATH;
    return NextResponse.redirect(targetUrl);
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const existingLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (!isAppLocale(existingLocale)) {
    const negotiated = negotiateLocaleFromAcceptLanguage(
      request.headers.get("accept-language"),
      DEFAULT_LOCALE
    );
    setLocaleCookie(response, negotiated);
  }

  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const isAppRoute = isAppRecetasPath(pathname);
  const isOlivaRoute = pathname === "/oliva" || pathname.startsWith("/oliva/");
  const isPublicRoute =
    PUBLIC_ROUTES.has(pathname) || isAppRoute || isOlivaRoute;

  if (
    session &&
    (pathname === "/login" ||
      pathname === "/auth" ||
      pathname === "/registro" ||
      pathname === TRY_PATH)
  ) {
    const isPasswordResetSuccess =
      pathname === "/login" &&
      request.nextUrl.searchParams.get("reset") === "1";

    if (!isPasswordResetSuccess) {
      const targetUrl = request.nextUrl.clone();
      targetUrl.pathname = enforceMobileOnly ? DESKTOP_APP_PATH : APP_PATH;
      targetUrl.search = "";
      return NextResponse.redirect(targetUrl);
    }
  }

  if (!session && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    if (enforceMobileOnly) {
      redirectUrl.pathname = TRY_PATH;
      redirectUrl.search = "";
    } else {
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|manifest.json|__nextjs_font|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|mjs|map|woff|woff2|ttf|otf|eot|ico|txt|xml)$).*)"
  ]
};
