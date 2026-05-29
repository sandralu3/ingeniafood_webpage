export type PantryCategoryDb = "proteinas" | "vegetales" | "basicos_despensa";

export type CategoryKey = "Proteinas" | "Vegetales" | "Basicos de Despensa";

export type MasterIngredient = {
  id: string;
  name: string;
  category: PantryCategoryDb;
};

export type PantryFavorite = {
  favoriteId: string;
  ingredientId: string;
  name: string;
  category: PantryCategoryDb;
};

export const CATEGORY_UI_TO_DB: Record<CategoryKey, PantryCategoryDb> = {
  Proteinas: "proteinas",
  Vegetales: "vegetales",
  "Basicos de Despensa": "basicos_despensa"
};

export const CATEGORY_DB_TO_UI: Record<PantryCategoryDb, CategoryKey> = {
  proteinas: "Proteinas",
  vegetales: "Vegetales",
  basicos_despensa: "Basicos de Despensa"
};
