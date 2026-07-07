export const APP_ROUTES = {
  root: "/app-recetas",
  hoy: "/app-recetas/hoy",
  plan: "/app-recetas/plan",
  retos: "/app-recetas/retos",
  scanner: "/app-recetas/scanner",
  guardadas: "/app-recetas/recipes",
  perfil: "/app-recetas/profile"
} as const;

export type AppTabRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];
