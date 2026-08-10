export const APP_ROUTES = {
  root: "/app-recetas",
  hoy: "/app-recetas/hoy",
  plan: "/app-recetas/plan",
  retos: "/app-recetas/retos",
  parametros: "/app-recetas/parametros",
  scanner: "/app-recetas/scanner",
  guardadas: "/app-recetas/recipes",
  perfil: "/app-recetas/profile",
  admin: "/app-recetas/admin",
  adminRecetasSandra: "/app-recetas/admin/recetas-sandra"
} as const;

export type AppTabRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];
