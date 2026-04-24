import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

const PUBLIC_ROUTES = new Set([
  "/",
  "/auth",
  "/auth/callback",
  "/login",
  "/registro",
  "/desktop-app-recetas",
  "/descargar-app"
]);
const APP_ACCESS_COOKIE = "ingeniafood_app_access";
const APP_ACCESS_QUERY_KEY = "k";

function isMobileUserAgent(userAgent: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    userAgent
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, protocol } = request.nextUrl;
  const forwardedProto = request.headers.get("x-forwarded-proto");

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

  const userAgent = request.headers.get("user-agent") ?? "";
  const isMobile = isMobileUserAgent(userAgent);
  const isProtectedAppRoute =
    pathname === "/app-recetas" ||
    pathname.startsWith("/app-recetas/") ||
    pathname === "/desktop-app-recetas" ||
    pathname.startsWith("/desktop-app-recetas");

  // No redirigir ni proteger APIs aquí; cada endpoint maneja su auth/errores JSON.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

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
    targetUrl.pathname = isMobile ? "/app-recetas" : "/desktop-app-recetas";
    return NextResponse.redirect(targetUrl);
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
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

  const isAppRoute = pathname === "/app-recetas" || pathname.startsWith("/app-recetas/");
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  if (session && (pathname === "/login" || pathname === "/auth" || pathname === "/registro")) {
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = "/app-recetas";
    targetUrl.search = "";
    return NextResponse.redirect(targetUrl);
  }

  if (!session && isAppRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    redirectUrl.searchParams.set("reason", "app-recetas-auth");
    return NextResponse.redirect(redirectUrl);
  }

  if (!session && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/app-recetas" && !isMobile) {
    const desktopUrl = request.nextUrl.clone();
    desktopUrl.pathname = "/desktop-app-recetas";
    return NextResponse.rewrite(desktopUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|manifest.json|__nextjs_font|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|mjs|map|woff|woff2|ttf|otf|eot|ico|txt|xml)$).*)"
  ]
};
