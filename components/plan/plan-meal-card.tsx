"use client";

import { useState, type HTMLAttributes } from "react";
import Link from "next/link";
import { ArrowRightLeft, Camera, Coffee, Clock3, Check, Flame, GripVertical, Loader2, MapPin, Pencil, Soup, Trash2, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";
import { MoveMealSlotDialog } from "@/components/plan/move-meal-slot-dialog";
import { RecipeInstagramLink } from "@/components/recipes/recipe-instagram-link";
import { RecipeMedia } from "@/components/recipes/recipe-media";
import { SandraRecipeBadge } from "@/components/recipes/sandra-recipe-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { removePlanMeal, setPlanMealConsumed } from "@/lib/plan/plan-service";
import type { MealType } from "@/lib/plan/constants";
import { getMealTypeIcon, getMealTypeSubtleAccent } from "@/lib/plan/meal-type-accent";
import {
  externalMealBadgeLabel,
  type ExternalMealBadge
} from "@/lib/plan/external-meal";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

export type PlanMeal = {
  id: string;
  recipeId: string;
  title: string;
  mealType: MealType;
  imageUrl?: string | null;
  instagramUrl?: string | null;
  isSocialVideo?: boolean;
  /** Tiempo de preparación en minutos */
  prepMinutes?: number;
  /** @deprecated Usa prepMinutes */
  calories?: number;
  /** Calorías estimadas de la receta */
  kcal?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  ingredientNames?: string[];
  hasVegetables?: boolean;
  hasProtein?: boolean;
  isAirfryer?: boolean;
  isFlourless?: boolean;
  /** Comida registrada (foto/texto); ya consumida. */
  externalBadge?: ExternalMealBadge | null;
  /** Receta de Sandra (catálogo). */
  isSandraRecipe?: boolean;
  /** Plato del plan marcado como ya comido (sale de la lista de compra). */
  consumido?: boolean;
};

type PlanMealCardProps = {
  meal: PlanMeal;
  onMealRemoved?: (mealType: MealType, planEntryId: string) => void;
  onRemoveError?: (message: string) => void;
  /** Abrir selector para cambiar el plato de esta entrada. */
  onChangeMeal?: (meal: PlanMeal) => void;
  /** Mover este plato a otro momento del mismo día. */
  onMoveToMealType?: (toMealType: MealType) => void;
  moveDisabled?: boolean;
  /** Hoy o pasado: permite «Ya comí». */
  canMarkConsumed?: boolean;
  onConsumedChange?: (
    mealType: MealType,
    planEntryId: string,
    consumido: boolean
  ) => void;
  variant?: "default" | "slot" | "panel" | "tile";
  /** Segundo+ plato del mismo bloque: UI secundaria / anidada. */
  isComplement?: boolean;
  className?: string;
  /** Ref del asa de arrastre (imagen). */
  dragHandleRef?: (node: HTMLElement | null) => void;
  /** Listeners de @dnd-kit para arrastrar desde la imagen/miniatura. */
  dragHandleProps?: HTMLAttributes<HTMLElement>;
};

function ExternalMealBadgePill({
  badge,
  compact = false,
  inline = false
}: {
  badge: ExternalMealBadge;
  compact?: boolean;
  /** Sin margen superior; para filas horizontales de metadatos. */
  inline?: boolean;
}) {
  const BadgeIcon = badge === "escaneado" ? Camera : MapPin;
  const shortLabel = badge === "escaneado" ? "Escaneado" : "Registrada";
  const useCompactChrome = compact || inline;

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center font-bold uppercase tracking-wide",
        useCompactChrome
          ? "gap-0.5 rounded-md px-1 py-0.5 text-[7px] leading-none"
          : "mt-1 gap-0.5 rounded-md px-1.5 py-0.5 text-[9px]",
        !inline && compact && "opacity-90",
        badge === "escaneado"
          ? "bg-sky-50 text-sky-800 ring-1 ring-sky-200/70"
          : "bg-violet-50 text-violet-800 ring-1 ring-violet-200/70"
      )}
    >
      <BadgeIcon
        className={useCompactChrome ? "h-2 w-2 shrink-0" : "h-2.5 w-2.5 shrink-0"}
        strokeWidth={2.25}
        aria-hidden
      />
      <span>{shortLabel}</span>
    </span>
  );
}

function getPrepMinutes(meal: PlanMeal): number | undefined {
  return meal.prepMinutes ?? meal.calories;
}

function formatMacroGrams(value: number | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return `${Math.round(value)}g`;
}

function MealMacroBadges({ meal }: { meal: PlanMeal }) {
  const protein = formatMacroGrams(meal.proteinGrams);
  const carbs = formatMacroGrams(meal.carbsGrams);
  const fat = formatMacroGrams(meal.fatGrams);
  if (!protein && !carbs && !fat) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {protein ? (
        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-emerald-700 ring-1 ring-emerald-100/80">
          {protein} P
        </span>
      ) : null}
      {carbs ? (
        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-amber-800 ring-1 ring-amber-100/80">
          {carbs} C
        </span>
      ) : null}
      {fat ? (
        <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-rose-700 ring-1 ring-rose-100/80">
          {fat} G
        </span>
      ) : null}
    </span>
  );
}

function buildNutritionPills(
  meal: PlanMeal,
  labels: { flourless: string; airfryer: string; healthy: string }
): string[] {
  const pills: string[] = [];

  if (meal.isFlourless) pills.push(labels.flourless);
  if (meal.isAirfryer) pills.push(labels.airfryer);
  if (!meal.isAirfryer && !meal.isFlourless) pills.push(labels.healthy);

  return pills.slice(0, 2);
}

function recipeDetailHref(recipeId: string) {
  return `/app-recetas/recipes/${recipeId}?from=plan`;
}

function getMealPlaceholderStyle(mealType: MealType): {
  className: string;
  Icon: typeof Coffee;
} {
  switch (mealType) {
    case "Desayuno":
      return {
        className: "bg-amber-50 text-amber-700 ring-amber-100/80",
        Icon: Coffee
      };
    case "Almuerzo":
      return {
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100/80",
        Icon: Utensils
      };
    case "Cena":
      return {
        className: "bg-indigo-50/70 text-indigo-700 ring-indigo-100/80",
        Icon: Soup
      };
    default:
      return {
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100/80",
        Icon: Utensils
      };
  }
}

function MealThumbnail({
  imageUrl,
  title,
  mealType,
  compact = false,
  mini = false,
  imageAlt,
  imageAltFallback
}: {
  imageUrl?: string | null;
  title: string;
  mealType: MealType;
  compact?: boolean;
  /** Complemento: miniatura más pequeña que el plato principal. */
  mini?: boolean;
  imageAlt: string;
  imageAltFallback: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const sizeClass = mini
    ? "h-12 w-12 rounded-xl"
    : compact
      ? "h-[4.5rem] w-[4.5rem] rounded-xl"
      : "h-20 w-20 rounded-xl";
  const iconSize = mini ? "h-4 w-4" : compact ? "h-5 w-5" : "h-7 w-7";
  const resolvedUrl =
    imageUrl && imageUrl.startsWith("http") && imageUrl !== failedUrl ? imageUrl : null;

  if (resolvedUrl) {
    return (
      <img
        src={resolvedUrl}
        alt={title ? imageAlt : imageAltFallback}
        className={cn("shrink-0 object-cover ring-1 ring-stone-100", sizeClass)}
        loading="lazy"
        draggable={false}
        onError={() => setFailedUrl(resolvedUrl)}
      />
    );
  }

  if (compact || mini) {
    const accent = getMealTypeSubtleAccent(mealType);
    const Icon = getMealTypeIcon(mealType);

    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center ring-1",
          sizeClass,
          accent.iconCircleBg,
          accent.iconRing,
          accent.iconText
        )}
        aria-hidden
      >
        <Icon className={cn("stroke-[1.75]", iconSize)} />
      </div>
    );
  }

  const { className, Icon } = getMealPlaceholderStyle(mealType);

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center ring-1", sizeClass, className)}
      aria-hidden
    >
      <Icon className={cn("stroke-[1.75]", iconSize)} />
    </div>
  );
}

function CompactActionButtons({
  isRemoving,
  removeDisabled,
  changeDisabled,
  onRemove,
  onChange,
  onMove,
  onToggleConsumed,
  canMarkConsumed,
  isConsumed,
  isTogglingConsumed,
  compact = false,
  mini = false,
  removeAria,
  changeAria,
  moveAria,
  markConsumedAria,
  undoConsumedAria
}: {
  isRemoving: boolean;
  removeDisabled: boolean;
  changeDisabled?: boolean;
  onRemove: () => void;
  onChange?: () => void;
  onMove?: () => void;
  onToggleConsumed?: () => void;
  canMarkConsumed?: boolean;
  isConsumed?: boolean;
  isTogglingConsumed?: boolean;
  compact?: boolean;
  mini?: boolean;
  removeAria: string;
  changeAria?: string;
  moveAria?: string;
  markConsumedAria?: string;
  undoConsumedAria?: string;
}) {
  const buttonSize = mini ? "h-6 w-6" : compact ? "h-7 w-7" : "h-8 w-8";
  const iconSize = mini ? "h-3 w-3" : compact ? "h-3 w-3" : "h-3.5 w-3.5";
  const showConsumed = Boolean(canMarkConsumed && onToggleConsumed);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5",
        compact || mini ? "flex-row" : "flex-col gap-1.5 sm:flex-row"
      )}
    >
      {showConsumed ? (
        <button
          type="button"
          onClick={onToggleConsumed}
          disabled={removeDisabled || isTogglingConsumed}
          aria-label={isConsumed ? undoConsumedAria : markConsumedAria}
          aria-pressed={Boolean(isConsumed)}
          title={isConsumed ? undoConsumedAria : markConsumedAria}
          className={cn(
            "inline-flex items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
            isConsumed
              ? "bg-[#556B2F]/15 text-[#3e5219] ring-1 ring-[#556B2F]/25 hover:bg-[#556B2F]/25"
              : mini
                ? "bg-transparent text-stone-400 hover:bg-emerald-50 hover:text-emerald-700"
                : "bg-stone-100 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700",
            buttonSize
          )}
        >
          {isTogglingConsumed ? (
            <Loader2 className={cn("animate-spin", iconSize)} />
          ) : (
            <Check className={iconSize} strokeWidth={2.5} />
          )}
        </button>
      ) : null}

      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          disabled={changeDisabled || removeDisabled}
          aria-label={changeAria}
          title={changeAria}
          className={cn(
            "inline-flex items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
            mini
              ? "bg-transparent text-stone-400 hover:bg-stone-100/80 hover:text-stone-600"
              : "bg-[#F0F4ED] text-[#3e5219] hover:bg-[#dce7c3]",
            buttonSize
          )}
        >
          <Pencil className={iconSize} strokeWidth={2.25} />
        </button>
      ) : null}

      {onMove ? (
        <button
          type="button"
          onClick={onMove}
          disabled={removeDisabled}
          aria-label={moveAria}
          title={moveAria}
          className={cn(
            "inline-flex items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
            mini
              ? "bg-transparent text-stone-400 hover:bg-sky-50 hover:text-sky-700"
              : "bg-sky-50 text-sky-800 hover:bg-sky-100",
            buttonSize
          )}
        >
          <ArrowRightLeft className={iconSize} strokeWidth={2.25} />
        </button>
      ) : null}

      <button
        type="button"
        onClick={onRemove}
        disabled={removeDisabled}
        aria-label={removeAria}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
          mini
            ? "bg-transparent text-stone-400 hover:bg-rose-50 hover:text-rose-500"
            : "bg-stone-100 text-stone-600 hover:bg-stone-200",
          buttonSize
        )}
      >
        {isRemoving ? (
          <Loader2 className={cn("animate-spin", iconSize)} />
        ) : (
          <Trash2 className={iconSize} strokeWidth={2.25} />
        )}
      </button>
    </div>
  );
}

function HorizontalMealCard({
  meal,
  isFading,
  showMealType = true,
  compact = false,
  isComplement = false,
  isRemoving,
  removeDisabled,
  onRemove,
  onChange,
  onMove,
  onToggleConsumed,
  canMarkConsumed,
  isTogglingConsumed,
  className,
  mealTypeLabel,
  removeAria,
  changeAria,
  moveAria,
  markConsumedAria,
  undoConsumedAria,
  consumedBadgeLabel,
  viewRecipeAria,
  imageAlt,
  imageAltFallback,
  nutritionPills,
  dragHandleRef,
  dragHandleProps,
  complementAddedLabel
}: {
  meal: PlanMeal;
  isFading: boolean;
  showMealType?: boolean;
  compact?: boolean;
  isComplement?: boolean;
  isRemoving: boolean;
  removeDisabled: boolean;
  onRemove: () => void;
  onChange?: () => void;
  onMove?: () => void;
  onToggleConsumed?: () => void;
  canMarkConsumed?: boolean;
  isTogglingConsumed?: boolean;
  className?: string;
  mealTypeLabel: string;
  removeAria: string;
  changeAria?: string;
  moveAria?: string;
  markConsumedAria?: string;
  undoConsumedAria?: string;
  consumedBadgeLabel?: string;
  viewRecipeAria: string;
  imageAlt: string;
  imageAltFallback: string;
  nutritionPills: string[];
  dragHandleRef?: (node: HTMLElement | null) => void;
  dragHandleProps?: HTMLAttributes<HTMLElement>;
  complementAddedLabel?: string;
}) {
  const thumbnail = (
    <MealThumbnail
      imageUrl={meal.imageUrl}
      title={meal.title}
      mealType={meal.mealType}
      compact={compact}
      mini={isComplement}
      imageAlt={imageAlt}
      imageAltFallback={imageAltFallback}
    />
  );

  // En panel (plan semanal), la foto queda fuera del Link para poder arrastrarla
  // sin que el navegador capture el drag del <a>/<img>.
  const imageOutsideLink = compact || Boolean(dragHandleProps);

  const consumedPill =
    meal.consumido && consumedBadgeLabel ? (
      <span className="inline-flex w-fit shrink-0 items-center rounded-md bg-[#eef4e6] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3e5219] ring-1 ring-[#556B2F]/20">
        {consumedBadgeLabel}
      </span>
    ) : null;

  const actions = (
    <div className="ml-auto flex shrink-0 items-center gap-1">
      {meal.instagramUrl && !compact ? (
        <RecipeInstagramLink
          url={meal.instagramUrl}
          className="!border-stone-200 !bg-stone-50 !px-2 !py-0.5 !text-[10px] !text-stone-600"
        />
      ) : null}
      <CompactActionButtons
        compact={compact}
        mini={isComplement}
        isRemoving={isRemoving}
        removeDisabled={removeDisabled}
        changeDisabled={removeDisabled}
        onRemove={onRemove}
        onChange={onChange}
        onMove={onMove}
        onToggleConsumed={onToggleConsumed}
        canMarkConsumed={canMarkConsumed}
        isConsumed={Boolean(meal.consumido)}
        isTogglingConsumed={isTogglingConsumed}
        removeAria={removeAria}
        changeAria={changeAria}
        moveAria={moveAria}
        markConsumedAria={markConsumedAria}
        undoConsumedAria={undoConsumedAria}
      />
    </div>
  );

  // Panel diario: fila compacta (principal o complemento).
  if (compact) {
    return (
      <article
        className={cn(
          "flex items-center gap-2.5 transition-all duration-300",
          isComplement ? "gap-2 py-0" : "gap-3 py-0",
          isFading && "scale-[0.98] opacity-70",
          className
        )}
      >
        {dragHandleProps ? (
          <button
            type="button"
            ref={dragHandleRef}
            className={cn(
              "relative shrink-0 touch-manipulation cursor-grab rounded-xl active:cursor-grabbing",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5A3A]/40"
            )}
            aria-label="Arrastrar comida a otro horario"
            {...dragHandleProps}
          >
            {thumbnail}
            {!isComplement ? (
              <span
                className="pointer-events-none absolute bottom-0 right-0 rounded bg-black/45 p-px text-white"
                aria-hidden
              >
                <GripVertical className="h-2 w-2" strokeWidth={2.5} />
              </span>
            ) : null}
          </button>
        ) : null}

        {isComplement ? (
          <>
            <Link
              href={recipeDetailHref(meal.recipeId)}
              data-no-dnd="true"
              className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-xl py-0.5 transition hover:bg-stone-50/50"
              aria-label={viewRecipeAria}
            >
              {!dragHandleProps ? (
                <span className="shrink-0 select-none">{thumbnail}</span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-medium text-stone-400">
                  {complementAddedLabel ?? "Agregado de Complemento:"}
                </span>
                <span className="mt-0.5 block truncate text-xs font-bold text-stone-800">
                  {meal.title}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {meal.externalBadge ? (
                    <ExternalMealBadgePill badge={meal.externalBadge} inline />
                  ) : null}
                  {consumedPill}
                  {meal.kcal ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-stone-500">
                      <Flame className="h-2.5 w-2.5 text-orange-500" strokeWidth={2.25} />
                      {meal.kcal} kcal
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
            {actions}
          </>
        ) : (
          <>
            <Link
              href={recipeDetailHref(meal.recipeId)}
              data-no-dnd="true"
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-0.5 transition hover:bg-stone-50/60 active:bg-stone-50"
              aria-label={viewRecipeAria}
            >
              {!dragHandleProps ? (
                <span className="shrink-0 select-none">{thumbnail}</span>
              ) : null}
              <span className="min-w-0 flex-1">
                {showMealType ? (
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400">
                    {mealTypeLabel}
                  </p>
                ) : null}
                <h3
                  className={cn(
                    "line-clamp-2 text-sm font-semibold leading-snug text-stone-800",
                    showMealType && "mt-0.5"
                  )}
                >
                  {meal.title}
                </h3>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  {meal.externalBadge ? (
                    <ExternalMealBadgePill badge={meal.externalBadge} inline />
                  ) : null}
                  {consumedPill}
                  {meal.kcal ? (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-stone-500">
                      <Flame className="h-3 w-3 text-orange-500" strokeWidth={2.25} />
                      {meal.kcal} kcal
                    </span>
                  ) : null}
                  {getPrepMinutes(meal) ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-400">
                      <Clock3 className="h-2.5 w-2.5" />
                      {getPrepMinutes(meal)} min
                    </span>
                  ) : null}
                  <MealMacroBadges meal={meal} />
                </div>
              </span>
            </Link>
            {actions}
          </>
        )}
      </article>
    );
  }

  return (
    <article
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-stone-100/80 bg-white p-3 shadow-md shadow-stone-200/40 transition-all duration-300",
        isFading && "scale-[0.98] opacity-70",
        className
      )}
    >
      {dragHandleProps ? (
        <button
          type="button"
          ref={dragHandleRef}
          className={cn(
            "relative shrink-0 touch-manipulation cursor-grab rounded-lg active:cursor-grabbing",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E5A3A]/40"
          )}
          aria-label="Arrastrar comida a otro horario"
          {...dragHandleProps}
        >
          {thumbnail}
          <span
            className="pointer-events-none absolute bottom-0.5 right-0.5 rounded bg-black/45 p-0.5 text-white"
            aria-hidden
          >
            <GripVertical className="h-2.5 w-2.5" strokeWidth={2.5} />
          </span>
        </button>
      ) : imageOutsideLink ? (
        <div className="shrink-0 select-none">{thumbnail}</div>
      ) : null}

      <Link
        href={recipeDetailHref(meal.recipeId)}
        data-no-dnd="true"
        className="flex min-w-0 flex-1 items-center gap-4 rounded-xl transition hover:bg-stone-50/60 active:bg-stone-50"
        aria-label={viewRecipeAria}
      >
        {!imageOutsideLink ? thumbnail : null}

        <div className="min-w-0 flex-1">
          {showMealType ? (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
              {mealTypeLabel}
            </p>
          ) : null}

          <h3
            className={cn(
              "line-clamp-2 text-[11px] font-bold leading-snug text-stone-800",
              showMealType ? "mt-0.5" : ""
            )}
          >
            {meal.title}
          </h3>

          {meal.externalBadge ? <ExternalMealBadgePill badge={meal.externalBadge} /> : null}
          {consumedPill}

          {getPrepMinutes(meal) || meal.kcal || nutritionPills.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {getPrepMinutes(meal) ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  <Clock3 className="h-3 w-3" />
                  {getPrepMinutes(meal)} min
                </span>
              ) : null}

              {meal.kcal ? (
                <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-800 ring-1 ring-orange-100">
                  {meal.kcal} kcal
                </span>
              ) : null}

              {nutritionPills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full bg-stone-50 px-2.5 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200/70"
                >
                  {pill}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Link>

      {actions}
    </article>
  );
}

export function PlanMealCard({
  meal,
  onMealRemoved,
  onRemoveError,
  onChangeMeal,
  onMoveToMealType,
  moveDisabled = false,
  canMarkConsumed = false,
  onConsumedChange,
  variant = "default",
  isComplement = false,
  className,
  dragHandleRef,
  dragHandleProps
}: PlanMealCardProps) {
  const t = useTranslations("Plan");
  const tCommon = useTranslations("Common");
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isTogglingConsumed, setIsTogglingConsumed] = useState(false);

  const isPanel = variant === "panel";
  const isCompact = variant === "slot";
  const hasReel = Boolean(meal.instagramUrl && !meal.imageUrl);
  const useHeroLayout = isCompact && (Boolean(meal.imageUrl) || hasReel);

  const removeDisabled = isRemoving || isTogglingConsumed || moveDisabled;
  const allowMarkConsumed =
    canMarkConsumed && !meal.externalBadge && Boolean(onConsumedChange);

  const mealTypeLabel = t(`meals.${meal.mealType}`);
  const removeAria = t("removeAria");
  const changeAria = t.has("changeRecipeAria") ? t("changeRecipeAria") : "Cambiar plato";
  const moveAria = t.has("moveRecipeAria")
    ? t("moveRecipeAria")
    : "Mover a otra comida del día";
  const markConsumedAria = t.has("markConsumedAria")
    ? t("markConsumedAria")
    : "Marcar como Ya comí";
  const undoConsumedAria = t.has("undoConsumedAria")
    ? t("undoConsumedAria")
    : "Desmarcar Ya comí";
  const consumedBadgeLabel = t.has("consumedBadge") ? t("consumedBadge") : "Ya comí";
  const viewRecipeAria = t("viewRecipeAria", { title: meal.title });
  const imageAlt = t("recipeImageAlt", { title: meal.title });
  const imageAltFallback = t("recipeImageAltFallback");
  const nutritionPills = buildNutritionPills(meal, {
    flourless: t("tagFlourless"),
    airfryer: t("tagAirfryer"),
    healthy: t("tagHealthy")
  });
  const complementAddedLabel = t.has("complementAddedLabel")
    ? t("complementAddedLabel")
    : "Agregado de Complemento:";

  const handleChange = () => {
    if (removeDisabled) return;
    onChangeMeal?.(meal);
  };

  const handleToggleConsumed = async () => {
    if (!allowMarkConsumed || removeDisabled) return;

    setIsTogglingConsumed(true);
    const next = !meal.consumido;

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        onRemoveError?.(t("loginToEdit"));
        return;
      }

      const updated = await setPlanMealConsumed({
        userId: user.id,
        planEntryId: meal.id,
        consumido: next
      });

      if (!updated) {
        onRemoveError?.(
          t.has("consumedError")
            ? t("consumedError")
            : "No pudimos actualizar «Ya comí». Inténtalo de nuevo."
        );
        return;
      }

      onConsumedChange?.(meal.mealType, meal.id, next);
    } catch (error) {
      console.error("[plan-meal-card] Error marcando consumido:", error);
      onRemoveError?.(
        t.has("consumedError")
          ? t("consumedError")
          : "No pudimos actualizar «Ya comí». Inténtalo de nuevo."
      );
    } finally {
      setIsTogglingConsumed(false);
    }
  };

  const handleRemove = async () => {
    if (removeDisabled) return;

    setIsRemoving(true);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        onRemoveError?.(t("loginToEdit"));
        return;
      }

      const removed = await removePlanMeal({
        userId: user.id,
        planEntryId: meal.id
      });

      if (!removed) {
        onRemoveError?.(t("removeError"));
        return;
      }

      setIsRemoveDialogOpen(false);
      onMealRemoved?.(meal.mealType, meal.id);
    } catch (error) {
      console.error("[plan-meal-card] Error quitando receta:", error);
      onRemoveError?.(t("removeErrorGeneric"));
    } finally {
      setIsRemoving(false);
    }
  };

  const requestRemove = () => {
    if (removeDisabled) return;
    setIsRemoveDialogOpen(true);
  };

  const actionProps = {
    isRemoving,
    removeDisabled,
    onRemove: requestRemove,
    onChange: onChangeMeal ? handleChange : undefined,
    onMove: onMoveToMealType
      ? () => {
          if (removeDisabled) return;
          setIsMoveDialogOpen(true);
        }
      : undefined,
    onToggleConsumed: allowMarkConsumed ? () => void handleToggleConsumed() : undefined,
    canMarkConsumed: allowMarkConsumed,
    isTogglingConsumed,
    mealTypeLabel,
    removeAria,
    changeAria,
    moveAria,
    markConsumedAria,
    undoConsumedAria,
    consumedBadgeLabel,
    viewRecipeAria,
    imageAlt,
    imageAltFallback,
    nutritionPills,
    complementAddedLabel
  };

  const confirmDialog = (
    <>
    <ConfirmDialog
      open={isRemoveDialogOpen}
      onOpenChange={setIsRemoveDialogOpen}
      title={t("removeConfirmTitle")}
      description={t("removeConfirmDescription", {
        title: meal.title,
        meal: mealTypeLabel
      })}
      confirmLabel={t("removeConfirm")}
      cancelLabel={tCommon("cancel")}
      onConfirm={() => void handleRemove()}
      isLoading={isRemoving}
      destructive
    />
    {onMoveToMealType ? (
      <MoveMealSlotDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        currentMealType={meal.mealType}
        dishTitle={meal.title}
        disabled={removeDisabled}
        onSelect={(toMealType) => onMoveToMealType(toMealType)}
      />
    ) : null}
    </>
  );

  if (variant === "tile") {
    const accent = getMealTypeSubtleAccent(meal.mealType);
    const hasImage = Boolean(meal.imageUrl) || hasReel;

    return (
      <>
        <article
          className={cn(
            "flex h-full w-full flex-col overflow-hidden rounded-lg border border-stone-100/90 bg-white shadow-sm shadow-stone-200/25",
            className
          )}
        >
          <div className="relative aspect-[3/2] w-full shrink-0 bg-stone-100">
            <Link
              href={recipeDetailHref(meal.recipeId)}
              data-no-dnd="true"
              className="absolute inset-0 block"
              aria-label={viewRecipeAria}
            >
              {hasImage ? (
                <RecipeMedia
                  imageUrl={meal.imageUrl}
                  isSocialVideo={hasReel}
                  variant="fill"
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <span
                  className={cn(
                    "flex h-full w-full items-center justify-center",
                    accent.iconCircleBg,
                    accent.iconText
                  )}
                >
                  {(() => {
                    const Icon = getMealTypeIcon(meal.mealType);
                    return <Icon className="h-5 w-5" strokeWidth={1.75} />;
                  })()}
                </span>
              )}
            </Link>
            {isComplement ? (
              <span className="pointer-events-none absolute left-1 top-1 z-10 rounded-md bg-white/90 px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-stone-600 shadow-sm ring-1 ring-stone-200/80">
                {t.has("complementBadge") ? t("complementBadge") : "Complemento"}
              </span>
            ) : null}
            {meal.instagramUrl ? (
              <div className="absolute right-0.5 top-0.5 z-10 scale-[0.8]" data-no-dnd="true">
                <RecipeInstagramLink url={meal.instagramUrl} variant="icon" />
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col gap-0.5 px-1.5 pb-1 pt-0.5" data-no-dnd="true">
            <Link href={recipeDetailHref(meal.recipeId)} className="block min-w-0" aria-label={viewRecipeAria}>
              <h3 className="line-clamp-1 text-[9px] font-bold leading-tight text-stone-800">
                {meal.title}
              </h3>
            </Link>

            <div className="flex min-w-0 flex-wrap items-center gap-0.5">
              {meal.externalBadge ? (
                <ExternalMealBadgePill badge={meal.externalBadge} compact inline />
              ) : meal.isSandraRecipe ? (
                <SandraRecipeBadge compact className="text-[7px] px-1 py-0.5" />
              ) : isComplement ? (
                <span className="inline-flex shrink-0 rounded-md bg-stone-100 px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-stone-500 ring-1 ring-stone-200/70">
                  {t.has("complementBadge") ? t("complementBadge") : "Complemento"}
                </span>
              ) : null}
              {meal.consumido ? (
                <span className="inline-flex shrink-0 items-center rounded-md bg-[#eef4e6] px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-[#3e5219] ring-1 ring-[#556B2F]/20">
                  {consumedBadgeLabel}
                </span>
              ) : null}
              {meal.kcal ? (
                <span className="shrink-0 text-[8px] font-semibold tabular-nums text-stone-400">
                  {meal.kcal} kcal
                </span>
              ) : null}
            </div>

            <div className="flex justify-end">
              <CompactActionButtons
                compact
                mini
                isRemoving={isRemoving}
                removeDisabled={removeDisabled}
                changeDisabled={removeDisabled}
                onRemove={requestRemove}
                onChange={onChangeMeal ? handleChange : undefined}
                onMove={
                  onMoveToMealType
                    ? () => {
                        if (removeDisabled) return;
                        setIsMoveDialogOpen(true);
                      }
                    : undefined
                }
                onToggleConsumed={allowMarkConsumed ? () => void handleToggleConsumed() : undefined}
                canMarkConsumed={allowMarkConsumed}
                isConsumed={Boolean(meal.consumido)}
                isTogglingConsumed={isTogglingConsumed}
                removeAria={removeAria}
                changeAria={changeAria}
                moveAria={moveAria}
                markConsumedAria={markConsumedAria}
                undoConsumedAria={undoConsumedAria}
              />
            </div>
          </div>
        </article>
        {confirmDialog}
      </>
    );
  }

  if (isPanel || variant === "default") {
    return (
      <>
        <HorizontalMealCard
          meal={meal}
          isFading={false}
          showMealType={!isPanel}
          compact={isPanel}
          isComplement={isComplement}
          className={className}
          dragHandleRef={dragHandleRef}
          dragHandleProps={dragHandleProps}
          {...actionProps}
        />
        {confirmDialog}
      </>
    );
  }

  if (useHeroLayout) {
    return (
      <>
        <article
          className={cn(
            "group relative h-36 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-md shadow-stone-200/40 transition-all duration-300",
            className
          )}
        >
          <Link
            href={recipeDetailHref(meal.recipeId)}
            className="absolute inset-0 z-10"
            aria-label={viewRecipeAria}
          />

          <RecipeMedia
            imageUrl={meal.imageUrl}
            isSocialVideo={hasReel}
            variant="fill"
            className="absolute inset-0 h-full w-full"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

          {onChangeMeal ? (
            <button
              type="button"
              onClick={handleChange}
              disabled={removeDisabled}
              aria-label={changeAria}
              title={changeAria}
              className={cn(
                "absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/80 text-[#3e5219] shadow-lg backdrop-blur-md transition hover:bg-white",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={requestRemove}
            disabled={removeDisabled}
            aria-label={removeAria}
            className={cn(
              "absolute left-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/80 text-stone-700 shadow-lg backdrop-blur-md transition hover:bg-white",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.25} />
          </button>

          {meal.instagramUrl ? (
            <RecipeInstagramLink url={meal.instagramUrl} variant="floating" />
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 pt-10">
            <h3 className="line-clamp-2 text-[11px] font-bold leading-snug text-white drop-shadow-md">
              {meal.title}
            </h3>
            {meal.externalBadge ? (
              <span className="mt-1 inline-flex rounded-md bg-black/35 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                {externalMealBadgeLabel(meal.externalBadge)}
              </span>
            ) : null}
            {getPrepMinutes(meal) || meal.kcal ? (
              <p className="mt-1 inline-flex flex-wrap items-center gap-2 text-[11px] font-medium text-white/80">
                {getPrepMinutes(meal) ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {getPrepMinutes(meal)} min
                  </span>
                ) : null}
                {meal.kcal ? <span>{meal.kcal} kcal</span> : null}
              </p>
            ) : null}
          </div>
        </article>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <HorizontalMealCard
        meal={meal}
        isFading={false}
        showMealType={false}
        className={className}
        {...actionProps}
      />
      {confirmDialog}
    </>
  );
}

