"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import {
  formatCustomIngredientName,
  isValidCustomIngredientName
} from "@/lib/pantry/validation";
import type { MasterIngredient, PantryCategoryDb, PantryFavorite } from "@/lib/pantry/types";
import { invalidatePremiumStoriesCache } from "@/lib/premium-stories/stories-cache";

type FavoriteRow = {
  id: string;
  ingredient_id: string;
};

function mapFavoritesFromMaster(
  rows: FavoriteRow[],
  masterById: Map<string, MasterIngredient>
): PantryFavorite[] {
  return rows
    .map((row) => {
      const ingredient = masterById.get(row.ingredient_id);
      if (!ingredient) return null;
      return {
        favoriteId: row.id,
        ingredientId: ingredient.id,
        name: ingredient.name,
        category: ingredient.category
      } satisfies PantryFavorite;
    })
    .filter((item): item is PantryFavorite => item !== null);
}

type UsePantryDataResult = {
  masterIngredients: MasterIngredient[];
  favorites: PantryFavorite[];
  favoriteIngredientIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  addFavorite: (ingredientId: string, knownIngredient?: MasterIngredient) => Promise<PantryFavorite | null>;
  createCustomIngredient: (
    rawName: string,
    category: PantryCategoryDb
  ) => Promise<MasterIngredient | null>;
  removeFavorite: (favoriteId: string) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
};

export function usePantryData(): UsePantryDataResult {
  const [masterIngredients, setMasterIngredients] = useState<MasterIngredient[]>([]);
  const [favorites, setFavorites] = useState<PantryFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMasterIngredients = useCallback(async (): Promise<MasterIngredient[]> => {
    const supabase = createSupabaseClient();
    const { data, error: fetchError } = await supabase
      .from("master_ingredients")
      .select("id, name, category")
      .order("name", { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    return (data as MasterIngredient[]) ?? [];
  }, []);

  const fetchFavorites = useCallback(
    async (masterList: MasterIngredient[]): Promise<PantryFavorite[]> => {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error: fetchError } = await supabase
        .from("user_pantry_favorites")
        .select("id, ingredient_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const masterById = new Map(masterList.map((item) => [item.id, item]));
      return mapFavoritesFromMaster((data as FavoriteRow[]) ?? [], masterById);
    },
    []
  );

  const loadFavorites = useCallback(
    async (masterList?: MasterIngredient[]) => {
      const catalog = masterList ?? masterIngredients;
      const mapped = await fetchFavorites(catalog);
      setFavorites(mapped);
    },
    [fetchFavorites, masterIngredients]
  );

  const refreshFavorites = useCallback(async () => {
    try {
      await loadFavorites();
    } catch (err) {
      console.error("[pantry] Error refrescando favoritos:", err);
    }
  }, [loadFavorites]);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const masters = await fetchMasterIngredients();
        setMasterIngredients(masters);

        try {
          const mappedFavorites = await fetchFavorites(masters);
          setFavorites(mappedFavorites);
        } catch (favoritesError) {
          console.error("[pantry] Error cargando favoritos:", favoritesError);
          setFavorites([]);
          setError("No pudimos cargar tus favoritos de despensa.");
        }
      } catch (err) {
        console.error("[pantry] Error cargando catálogo:", err);
        setError("No pudimos cargar el catálogo de ingredientes.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadAll();
  }, [fetchFavorites, fetchMasterIngredients]);

  const addFavorite = useCallback(
    async (ingredientId: string, knownIngredient?: MasterIngredient): Promise<PantryFavorite | null> => {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Inicia sesión para guardar favoritos en tu despensa.");
        return null;
      }

      const existing = favorites.find((fav) => fav.ingredientId === ingredientId);
      if (existing) {
        return existing;
      }

      const ingredient =
        knownIngredient ?? masterIngredients.find((item) => item.id === ingredientId);
      if (!ingredient) {
        setError("Ingrediente no encontrado en el catálogo.");
        return null;
      }

      const { data, error: insertError } = await supabase
        .from("user_pantry_favorites")
        .insert({ user_id: user.id, ingredient_id: ingredientId })
        .select("id, ingredient_id")
        .single();

      if (insertError) {
        console.error("[pantry] Error guardando favorito:", insertError);
        setError("No pudimos guardar el favorito.");
        return null;
      }

      const created: PantryFavorite = {
        favoriteId: data.id as string,
        ingredientId: ingredient.id,
        name: ingredient.name,
        category: ingredient.category
      };

      setFavorites((prev) => [...prev, created]);
      invalidatePremiumStoriesCache(user.id);
      return created;
    },
    [favorites, masterIngredients]
  );

  const createCustomIngredient = useCallback(
    async (rawName: string, category: PantryCategoryDb): Promise<MasterIngredient | null> => {
      const name = formatCustomIngredientName(rawName);
      if (!isValidCustomIngredientName(name)) {
        setError("Nombre de ingrediente no válido. Usa al menos 3 letras sin símbolos raros.");
        return null;
      }

      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Inicia sesión para crear ingredientes personalizados.");
        return null;
      }

      const existingLocal = masterIngredients.find(
        (item) => item.name.toLowerCase() === name.toLowerCase()
      );
      let ingredient = existingLocal ?? null;

      if (!ingredient) {
        const { data: existingRemote } = await supabase
          .from("master_ingredients")
          .select("id, name, category")
          .ilike("name", name)
          .maybeSingle();

        if (existingRemote) {
          ingredient = existingRemote as MasterIngredient;
        }
      }

      if (!ingredient) {
        const { data: inserted, error: insertMasterError } = await supabase
          .from("master_ingredients")
          .insert({ name, category })
          .select("id, name, category")
          .single();

        if (insertMasterError) {
          console.error("[pantry] Error creando ingrediente global:", insertMasterError);
          if (insertMasterError.code === "42501") {
            setError(
              "No tienes permiso para crear ingredientes. Ejecuta en Supabase la migración 20260528190000_master_ingredients_insert_policy.sql."
            );
          } else {
            setError("No pudimos crear el ingrediente en el catálogo.");
          }
          return null;
        }

        ingredient = inserted as MasterIngredient;
        setMasterIngredients((prev) =>
          [...prev, ingredient!].sort((a, b) => a.name.localeCompare(b.name, "es"))
        );
      } else if (!masterIngredients.some((item) => item.id === ingredient!.id)) {
        setMasterIngredients((prev) =>
          [...prev, ingredient!].sort((a, b) => a.name.localeCompare(b.name, "es"))
        );
      }

      const favorite = await addFavorite(ingredient.id, ingredient);
      if (!favorite) {
        return ingredient;
      }

      setError(null);
      return ingredient;
    },
    [addFavorite, masterIngredients]
  );

  const removeFavorite = useCallback(async (favoriteId: string): Promise<boolean> => {
    const supabase = createSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const { error: deleteError } = await supabase
      .from("user_pantry_favorites")
      .delete()
      .eq("id", favoriteId);

    if (deleteError) {
      console.error("[pantry] Error eliminando favorito:", deleteError);
      setError("No pudimos eliminar el favorito.");
      return false;
    }

    setFavorites((prev) => prev.filter((fav) => fav.favoriteId !== favoriteId));
    invalidatePremiumStoriesCache(user?.id ?? null);
    return true;
  }, []);

  const favoriteIngredientIds = new Set(favorites.map((fav) => fav.ingredientId));

  return {
    masterIngredients,
    favorites,
    favoriteIngredientIds,
    isLoading,
    error,
    addFavorite,
    createCustomIngredient,
    removeFavorite,
    refreshFavorites
  };
}
