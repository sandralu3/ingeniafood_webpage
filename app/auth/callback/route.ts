import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { getSupabaseProjectUrl } from "@/lib/supabaseConfig";
import { APP_ROUTES } from "@/lib/navigation/app-routes";

const RESET_PASSWORD_PATH = "/auth/reset-password";

function resolvePostAuthPath(params: {
  next: string | null;
  type: string | null;
}): string {
  if (params.type === "recovery") {
    return RESET_PASSWORD_PATH;
  }

  if (params.next) {
    const pathOnly = params.next.split("?")[0];
    if (pathOnly === RESET_PASSWORD_PATH || pathOnly.startsWith(`${RESET_PASSWORD_PATH}/`)) {
      return RESET_PASSWORD_PATH;
    }
    if (params.next.startsWith("/app-recetas")) {
      return params.next;
    }
  }

  return APP_ROUTES.hoy;
}

function buildLoginErrorRedirect(origin: string, reason: string): NextResponse {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("mode", "forgot");
  loginUrl.searchParams.set("error", reason);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const type = url.searchParams.get("type");

  if (!code) {
    return buildLoginErrorRedirect(url.origin, "missing_code");
  }

  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return buildLoginErrorRedirect(url.origin, "config_error");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      }
    }
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const isExpired =
      /expired|invalid|already been used|flow state/i.test(error.message) ||
      error.code === "otp_expired";

    if (isExpired) {
      const resetUrl = new URL(RESET_PASSWORD_PATH, url.origin);
      resetUrl.searchParams.set("error", "link_expired");
      return NextResponse.redirect(resetUrl);
    }

    return buildLoginErrorRedirect(url.origin, "exchange_failed");
  }

  const destination = resolvePostAuthPath({ next, type });
  return NextResponse.redirect(new URL(destination, url.origin));
}
