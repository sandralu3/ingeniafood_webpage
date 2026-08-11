"use client";

import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { getRecipePlaceholder } from "@/lib/recipes/recipe-placeholder";
import { parseMacrosFromJson } from "@/lib/recipes/recipe-macros";
import type { RecipePickerItem } from "@/lib/plan/plan-service";
import { getRecipePickerCardLabel } from "@/lib/recipes/saved-recipes-filter";
import type { Json } from "@/types/database.types";
import { cn } from "@/lib/utils";

type Props = {
  recipe: RecipePickerItem;
  disabled?: boolean;
  onSelect: () => void;
};

function translatePickerCardLabel(
  label: string | null,
  t: (key: string) => string
): string | null {
  if (!label) return null;
  switch (label) {
    case "Desayuno":
      return t("meals.Desayuno");
    case "Almuerzo":
      return t("meals.Almuerzo");
    case "Cena":
      return t("meals.Cena");
    case "Sin Harinas":
      return t("tagFlourless");
    case "Airfryer":
      return t("tagAirfryer");
    default:
      return label;
  }
}

export function PlanRecipePickerCard({ recipe, disabled = false, onSelect }: Props) {
  const t = useTranslations("Plan");
  const categoryLabel = translatePickerCardLabel(getRecipePickerCardLabel(recipe), t);
  const isSocialVideo = Boolean(recipe.instagram_url && !recipe.image_url);
  const macros = parseMacrosFromJson(recipe.macros as Json | null | undefined);
  const kcalLabel =
    macros && macros.calorias > 0
      ? `${Math.round(macros.calorias)} kcal`
      : recipe.cooking_time
        ? recipe.cooking_time
        : null;
  const placeholder = getRecipePlaceholder(recipe.title, recipe.id);
  const PlaceholderIcon = placeholder.Icon;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white text-left shadow-sm transition",
        "hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={t("recipeImageAlt", { title: recipe.title })}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : isSocialVideo ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-800 to-[#3d2e28]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
              <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center",
              placeholder.containerClass
            )}
            aria-hidden
          >
            <PlaceholderIcon className={cn("h-7 w-7", placeholder.iconClass)} strokeWidth={1.6} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-1.5 pb-1.5 pt-1.5 sm:px-2 sm:pb-2 sm:pt-2">
        <h3 className="line-clamp-2 min-h-[2rem] text-[10px] font-bold leading-snug text-stone-900 sm:min-h-[2.25rem] sm:text-[11px]">
          {recipe.title}
        </h3>

        <div className="flex flex-wrap items-center gap-1">
          {kcalLabel ? (
            <span className="text-[9px] font-medium text-stone-500 sm:text-[10px]">{kcalLabel}</span>
          ) : null}
          {categoryLabel ? (
            <span className="rounded-full bg-[#F8E8E4] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#C06A4F] sm:px-2 sm:text-[9px]">
              {categoryLabel}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
