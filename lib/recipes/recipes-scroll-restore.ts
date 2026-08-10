const STORAGE_KEY = "ingeniafood_recipes_scroll_v1";

export type RecipesScrollState = {
  tab: string | null;
  recipeId: string;
  scrollTop: number;
  savedAt: number;
};

/** Contenedor scrolleable de la PWA (`<main data-app-scroll-root>`). */
export function getAppScrollRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>("[data-app-scroll-root]");
}

/**
 * Fallback: sube el árbol buscando overflow-y scrolleable.
 * No exige scrollHeight > clientHeight (en móvil el layout aún puede estar midiendo).
 */
export function findAppScrollParent(start: HTMLElement | null): HTMLElement | null {
  const rooted = getAppScrollRoot();
  if (rooted) return rooted;

  let node: HTMLElement | null = start;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function saveRecipesScrollState(state: {
  tab: string | null;
  recipeId: string;
  scrollTop: number;
}): void {
  if (typeof window === "undefined") return;
  try {
    const payload: RecipesScrollState = {
      ...state,
      savedAt: Date.now()
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function peekRecipesScrollState(): RecipesScrollState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecipesScrollState;
    if (!parsed?.recipeId || typeof parsed.scrollTop !== "number") return null;
    if (Date.now() - (parsed.savedAt || 0) > 30 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearRecipesScrollState(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function recipeCardDomId(recipeId: string): string {
  return `recipe-card-${recipeId}`;
}

/**
 * Restaura scroll en el `<main>` de la PWA.
 * Evita `scrollIntoView` (en iOS/Android a menudo mueve el viewport o no hace nada
 * dentro de un overflow anidado).
 */
export function restoreRecipesScrollToCard(params: {
  recipeId?: string | null;
  fallbackScrollTop?: number | null;
}): boolean {
  const root = getAppScrollRoot() ?? findAppScrollParent(document.body);
  if (!root) return false;

  const card = params.recipeId
    ? document.getElementById(recipeCardDomId(params.recipeId))
    : null;

  if (card) {
    const rootRect = root.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const delta = cardRect.top - rootRect.top;
    const nextTop =
      root.scrollTop + delta - root.clientHeight / 2 + cardRect.height / 2;
    root.scrollTop = Math.max(0, nextTop);
    return true;
  }

  if (typeof params.fallbackScrollTop === "number") {
    root.scrollTop = Math.max(0, params.fallbackScrollTop);
    return true;
  }

  return false;
}
