"use client";

import { ChevronRight, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { getRecipePlaceholder } from "@/lib/recipes/recipe-placeholder";
import type { RecipePickerItem } from "@/lib/plan/plan-service";
import { getRecipePickerCardLabel } from "@/lib/recipes/saved-recipes-filter";
import { cn } from "@/lib/utils";

const thumbnailClass =
  "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg";

type Props = {
  recipe: RecipePickerItem;
  disabled?: boolean;
  onSelect: () => void;
};

function PickerThumbnail({
  title,
  recipeId,
  imageUrl,
  isSocialVideo,
  imageAlt
}: {
  title: string;
  recipeId: string;
  imageUrl?: string | null;
  isSocialVideo?: boolean;
  imageAlt: string;
}) {
  if (imageUrl) {
    return (
      <div className={cn(thumbnailClass, "border border-stone-200/40 bg-stone-100")}>
        <img
          src={imageUrl}
          alt={title ? imageAlt : ""}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  if (isSocialVideo) {
    return (
      <div
        className={cn(
          thumbnailClass,
          "flex items-center justify-center border border-stone-200/40 bg-gradient-to-br from-stone-800 to-[#3d2e28]"
        )}
      >
        <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
          <Play className="ml-0.5 h-3 w-3 fill-white text-white" />
        </div>
      </div>
    );
  }

  const placeholder = getRecipePlaceholder(title, recipeId);
  const PlaceholderIcon = placeholder.Icon;

  return (
    <div
      className={cn(
        thumbnailClass,
        "flex items-center justify-center border border-stone-200/40",
        placeholder.containerClass
      )}
      aria-hidden
    >
      <PlaceholderIcon className={cn("h-3.5 w-3.5", placeholder.iconClass)} strokeWidth={1.75} />
    </div>
  );
}

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

export function PlanRecipePickerRow({ recipe, disabled = false, onSelect }: Props) {
  const t = useTranslations("Plan");
  const categoryLabel = translatePickerCardLabel(getRecipePickerCardLabel(recipe), t);
  const isSocialVideo = Boolean(recipe.instagram_url && !recipe.image_url);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "mb-2 flex h-20 w-full cursor-pointer items-center justify-between rounded-xl border border-stone-200/60 bg-white p-2.5 text-left shadow-sm transition-colors",
        "hover:bg-stone-50/50 disabled:cursor-not-allowed disabled:opacity-60"
      )}
    >
      <PickerThumbnail
        title={recipe.title}
        recipeId={recipe.id}
        imageUrl={recipe.image_url}
        isSocialVideo={isSocialVideo}
        imageAlt={t("recipeImageAlt", { title: recipe.title })}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col justify-center px-3">
        <h3 className="mb-0.5 truncate text-[11px] font-bold text-stone-800">{recipe.title}</h3>
        {categoryLabel ? (
          <span className="w-fit rounded-md bg-[#F5EBE6] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#C06A4F]">
            {categoryLabel}
          </span>
        ) : null}
      </div>

      <div className="flex h-full shrink-0 items-center pl-1">
        <ChevronRight className="h-4 w-4 text-stone-300" strokeWidth={2} />
      </div>
    </button>
  );
}
