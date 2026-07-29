import type { User } from "@supabase/supabase-js";
import type { createSupabaseRouteClient } from "@/lib/supabaseRoute";

type SupabaseRouteClient = NonNullable<Awaited<ReturnType<typeof createSupabaseRouteClient>>>;

export type RouteAuthResult =
  | { status: "ok"; user: User }
  | { status: "unauthorized"; message: string }
  | { status: "unavailable"; message: string };

function isAuthNetworkFailure(error: { message?: string; status?: number; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("econnreset") ||
    message.includes("enotfound") ||
    message.includes("etimedout") ||
    code.includes("network") ||
    code.includes("timeout") ||
    error.status === 0 ||
    error.status === 408 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resuelve el usuario en Route Handlers.
 * - Reintenta getUser (valida JWT con Auth).
 * - Si Auth está caído/timeout, usa la sesión de cookies como fallback temporal
 *   para no devolver 401 falso a usuarios ya logueados.
 */
export async function getRouteUser(supabase: SupabaseRouteClient): Promise<RouteAuthResult> {
  let lastNetworkError = false;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (user) {
      return { status: "ok", user };
    }

    if (isAuthNetworkFailure(error)) {
      lastNetworkError = true;
      if (attempt === 0) {
        await sleep(350);
        continue;
      }
      break;
    }

    // Error de auth “real” (JWT inválido / sin sesión): no reintentar.
    break;
  }

  if (lastNetworkError) {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const sessionUser = session?.user ?? null;
    const expiresAt = session?.expires_at;
    const stillValid =
      Boolean(sessionUser) &&
      (typeof expiresAt !== "number" || expiresAt * 1000 > Date.now() + 15_000);

    if (stillValid && sessionUser) {
      console.warn(
        "[auth] getUser falló por red; usando sesión de cookie como fallback temporal.",
        { userId: sessionUser.id }
      );
      return { status: "ok", user: sessionUser };
    }

    return {
      status: "unavailable",
      message:
        "No pudimos verificar tu sesión (problema de conexión con el servicio de autenticación). Reinténtalo en unos segundos."
    };
  }

  return {
    status: "unauthorized",
    message: "Debes iniciar sesión para generar recetas."
  };
}
