const STORAGE_KEY = "ingeniafood_recipes_scroll_v1";

export type RecipesScrollState = {
  tab: string | null;
  recipeId: string;
  scrollTop: number;
  savedAt: number;
};

/** Contenedor scrolleable de la PWA (`<main>` del gate). */
export function findAppScrollParent(start: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = start;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
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
    // Descarta estados viejos (>30 min).
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
