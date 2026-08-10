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
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, savedAt: Date.now() } satisfies RecipesScrollState)
    );
  } catch {
    // ignore
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

export function parseRecipesLibraryTab(
  value: string | null | undefined
): "saved" | "sandra" | "favorites" | "outside" | null {
  const tab = (value || "").toLowerCase();
  if (tab === "sandra" || tab === "favorites" || tab === "outside" || tab === "saved") {
    return tab;
  }
  return null;
}

/**
 * Restaura scroll en el `<main>` de la PWA.
 * `needsMoreContent` = el listado aún no tiene altura suficiente (skeleton / imgs).
 */
export function restoreRecipesScrollToCard(params: {
  recipeId?: string | null;
  fallbackScrollTop?: number | null;
}): { ok: boolean; needsMoreContent: boolean } {
  const root = getAppScrollRoot() ?? findAppScrollParent(document.body);
  if (!root) return { ok: false, needsMoreContent: true };

  // Sin contenido scrolleable todavía (skeleton corto).
  if (root.scrollHeight <= root.clientHeight + 24) {
    return { ok: false, needsMoreContent: true };
  }

  const card = params.recipeId
    ? document.getElementById(recipeCardDomId(params.recipeId))
    : null;

  if (card) {
    const rootRect = root.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const delta = cardRect.top - rootRect.top;
    const nextTop = Math.max(
      0,
      root.scrollTop + delta - root.clientHeight / 2 + cardRect.height / 2
    );

    // Objetivo por debajo del final actual → faltan filas/imágenes.
    if (nextTop + root.clientHeight > root.scrollHeight + 8) {
      root.scrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
      return { ok: false, needsMoreContent: true };
    }

    root.scrollTop = nextTop;

    // Comprueba que la tarjeta quedó cerca del centro/viewport del main.
    const afterRoot = root.getBoundingClientRect();
    const afterCard = card.getBoundingClientRect();
    const visible =
      afterCard.bottom > afterRoot.top + 8 && afterCard.top < afterRoot.bottom - 8;
    return { ok: visible, needsMoreContent: !visible };
  }

  // Pedimos una tarjeta concreta que aún no está en el DOM.
  if (params.recipeId) {
    return { ok: false, needsMoreContent: true };
  }

  if (typeof params.fallbackScrollTop === "number") {
    const target = Math.max(0, params.fallbackScrollTop);
    if (target + root.clientHeight > root.scrollHeight + 8) {
      root.scrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
      return { ok: false, needsMoreContent: true };
    }
    root.scrollTop = target;
    return { ok: true, needsMoreContent: false };
  }

  return { ok: false, needsMoreContent: false };
}
