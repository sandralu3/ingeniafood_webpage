import { findFoodDensity } from "@/lib/plan/food-density";
import type { ExternalMealEstimate, ExternalMealFoodItem } from "@/lib/plan/external-meal";

export type AiCalculoAlimento = {
  nombre: string;
  cantidad: number;
  unidad: string;
  calorias: number;
};

/** Lo que la IA (o el fallback) calculó ANTES de ajustar con la tabla. */
export type AiCalculoSnapshot = {
  nombre_plato: string;
  calorias_est: number;
  assumptions?: string;
  alimentos: AiCalculoAlimento[];
};

export type CalorieSourceKind = "tabla" | "ia" | "texto" | "mixto";

export function captureAiCalculo(estimate: ExternalMealEstimate): AiCalculoSnapshot {
  return {
    nombre_plato: estimate.nombre_plato,
    calorias_est: estimate.calorias_est,
    assumptions: estimate.assumptions?.trim() || undefined,
    alimentos: estimate.alimentos.map((item) => ({
      nombre: item.nombre,
      cantidad: item.cantidad,
      unidad: item.unidad,
      calorias: item.calorias
    }))
  };
}

function formatQty(value: number): string {
  if (Number.isInteger(value) || value >= 10) return String(Math.round(value));
  return String(Math.round(value * 100) / 100);
}

function portionLabel(item: Pick<ExternalMealFoodItem, "nombre" | "cantidad" | "unidad">): string {
  return `${formatQty(item.cantidad)} ${item.unidad} de ${item.nombre}`;
}

export function describeShownCalorieSource(foods: ExternalMealFoodItem[]): {
  kind: CalorieSourceKind;
  detail: string;
} {
  if (foods.length === 0) {
    return { kind: "ia", detail: "" };
  }

  const parts = foods.map((item) => {
    const density = findFoodDensity(item.nombre);
    return {
      label: portionLabel(item),
      catalog: density?.name ?? null
    };
  });

  const allCatalog = parts.every((part) => part.catalog);
  const noneCatalog = parts.every((part) => !part.catalog);
  const detail = parts
    .slice(0, 3)
    .map((part) =>
      part.catalog ? `${part.label} (${part.catalog})` : `${part.label} (IA)`
    )
    .join("; ");
  const extra = parts.length > 3 ? ` +${parts.length - 3}` : "";

  if (allCatalog) return { kind: "tabla", detail: `${detail}${extra}` };
  if (noneCatalog) return { kind: "ia", detail: `${detail}${extra}` };
  return { kind: "mixto", detail: `${detail}${extra}` };
}

export function foodsWereEdited(
  original: ExternalMealFoodItem[],
  current: ExternalMealFoodItem[]
): boolean {
  if (original.length !== current.length) return true;
  const byId = new Map(original.map((item) => [item.id, item]));
  return current.some((item) => {
    const prev = byId.get(item.id);
    if (!prev) return true;
    return (
      prev.nombre !== item.nombre ||
      prev.unidad !== item.unidad ||
      Math.abs(prev.cantidad - item.cantidad) > 0.001
    );
  });
}
