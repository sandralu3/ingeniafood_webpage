import { APP_ROUTES } from "@/lib/navigation/app-routes";

const RESET_PASSWORD_PATH = "/auth/reset-password";

export function resolvePostAuthPath(params: {
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
