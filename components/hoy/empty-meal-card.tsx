"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { Loader2, Plus, Sparkles, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { SuggestionRecipeDetailModal } from "@/components/hoy/suggestion-recipe-detail-modal";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { usePremium } from "@/hooks/use-premium";
import type { MealType } from "@/lib/plan/constants";
import { assignRecipeToPlan } from "@/lib/plan/plan-service";
import type { MealSuggestion, RemainingMacros } from "@/lib/plan/meal-suggestion";
import {
  getMondayOfWeek,
  getWeekDayFromDate,
  toISODateString
} from "@/lib/plan/week-utils";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

const SLOT_STYLE: Record<
  MealType,
  { emoji: string; gradient: string; accent: string }
> = {
  Desayuno: {
    emoji: "🥣",
    gradient: "from-amber-50 via-orange-50/80 to-amber-100/60",
    accent: "text-amber-900"
  },
  Almuerzo: {
    emoji: "🥗",
    gradient: "from-emerald-50 via-lime-50/70 to-teal-50/80",
    accent: "text-emerald-950"
  },
  Cena: {
    emoji: "🍲",
    gradient: "from-stone-50 via-orange-50/50 to-rose-50/60",
    accent: "text-stone-800"
  }
};

type EmptyMealCardProps = {
  mealType: MealType;
  slotLabel: string;
  userId?: string | null;
  remainingMacros?: RemainingMacros | null;
  excludeRecipeIds?: string[];
  onAssigned?: () => void;
  onAddSuccess?: (message: string) => void;
  className?: string;
};

async function fetchSuggestion(params: {
  mealType: MealType;
  remainingMacros?: RemainingMacros | null;
  excludeRecipeIds?: string[];
  preferAi?: boolean;
}): Promise<MealSuggestion | null> {
  const response = await fetch("/api/meal-suggestion", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mealType: params.mealType,
      remainingMacros: params.remainingMacros ?? undefined,
      excludeRecipeIds: params.excludeRecipeIds ?? [],
      preferAi: params.preferAi ?? true
    })
  });

  const payload = (await response.json()) as {
    suggestion?: MealSuggestion;
    error?: string;
    code?: string;
  };

  if (!response.ok || !payload.suggestion) {
    throw new Error(payload.error ?? "No suggestion");
  }

  return payload.suggestion;
}

function FreeEmptyMealCard({
  mealType,
  slotLabel,
  className,
  onUnlockPremium
}: {
  mealType: MealType;
  slotLabel: string;
  className?: string;
  onUnlockPremium: () => void;
}) {
  const t = useTranslations("Hoy");
  const style = SLOT_STYLE[mealType];
  const fallbackPrompt = t.has("emptyMealPrompt")
    ? t("emptyMealPrompt", { meal: slotLabel })
    : `¿Qué comerás en el ${slotLabel}?`;
  const hint = t.has("emptyMealHint") ? t("emptyMealHint") : "Toca para planificar";
  const addChip = t.has("emptyMealAddSlotCta")
    ? t("emptyMealAddSlotCta", { meal: slotLabel })
    : `+ Añadir ${slotLabel}`;
  const aiBadge = t.has("emptyMealAiBadge")
    ? t("emptyMealAiBadge")
    : "Idea Pro 👑";

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/70 bg-gradient-to-br p-2.5 shadow-sm",
        style.gradient,
        className
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-2xl leading-none" aria-hidden>
          {style.emoji}
        </span>
        <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-stone-600 shadow-sm">
          {slotLabel}
        </span>
      </div>

      <p className={cn("mt-2 line-clamp-2 text-[12px] font-bold leading-snug", style.accent)}>
        {fallbackPrompt}
      </p>
      <p className="mt-0.5 text-[10px] font-medium text-stone-500">{hint}</p>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
        <Link
          href={APP_ROUTES.plan}
          className="inline-flex w-fit items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#3e5219] shadow-sm ring-1 ring-[#556B2F]/15 transition hover:bg-white"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          {addChip}
        </Link>
        <button
          type="button"
          onClick={onUnlockPremium}
          className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-50/95 px-2 py-1 text-[9px] font-bold text-amber-900 ring-1 ring-amber-100 transition hover:bg-amber-100/90"
          aria-label={
            t.has("emptyMealAiBadgeAria")
              ? t("emptyMealAiBadgeAria")
              : "Desbloquear sugerencias inteligentes con Premium"
          }
        >
          <Sparkles className="h-3 w-3" />
          {aiBadge}
        </button>
      </div>
    </div>
  );
}

export function EmptyMealCard({
  mealType,
  slotLabel,
  userId = null,
  remainingMacros = null,
  excludeRecipeIds = [],
  onAssigned,
  onAddSuccess,
  className
}: EmptyMealCardProps) {
  const t = useTranslations("Hoy");
  const {
    isPremium,
    isLoading: isPremiumLoading,
    refresh: refreshPremium
  } = usePremium();
  const premiumReady = Boolean(isPremium && !isPremiumLoading);
  const style = SLOT_STYLE[mealType];
  const [suggestion, setSuggestion] = useState<MealSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId) && premiumReady);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenIdsRef = useRef<string[]>([...excludeRecipeIds]);
  const remainingMacrosRef = useRef(remainingMacros);
  const excludeRecipeIdsRef = useRef(excludeRecipeIds);

  remainingMacrosRef.current = remainingMacros;
  excludeRecipeIdsRef.current = excludeRecipeIds;

  const notifyAdded = useCallback(() => {
    const message = t.has("emptyMealAddedToast")
      ? t("emptyMealAddedToast", { meal: slotLabel })
      : `¡Añadido a tu ${slotLabel} de hoy! 🎉`;
    onAddSuccess?.(message);
  }, [onAddSuccess, slotLabel, t]);

  const loadSuggestion = useCallback(
    async (opts?: { preferAi?: boolean; excludeExtra?: string[] }) => {
      if (!userId || !premiumReady) {
        setSuggestion(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      setError(null);
      try {
        const next = await fetchSuggestion({
          mealType,
          remainingMacros: remainingMacrosRef.current,
          excludeRecipeIds: [
            ...seenIdsRef.current,
            ...(opts?.excludeExtra ?? [])
          ],
          preferAi: opts?.preferAi ?? true
        });
        if (next) {
          seenIdsRef.current = Array.from(
            new Set([...seenIdsRef.current, next.recipeId])
          ).slice(-12);
          setSuggestion(next);
        }
      } catch {
        setError(
          t.has("emptyMealSuggestError")
            ? t("emptyMealSuggestError")
            : "No encontramos una sugerencia ahora."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [mealType, premiumReady, t, userId]
  );

  useEffect(() => {
    if (!premiumReady || !userId) {
      setSuggestion(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    let cancelled = false;
    seenIdsRef.current = [...excludeRecipeIdsRef.current];
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const next = await fetchSuggestion({
          mealType,
          remainingMacros: remainingMacrosRef.current,
          excludeRecipeIds: seenIdsRef.current,
          preferAi: false
        });
        if (cancelled) return;
        if (next) {
          seenIdsRef.current = Array.from(
            new Set([...seenIdsRef.current, next.recipeId])
          ).slice(-12);
          setSuggestion(next);
        }
      } catch {
        if (cancelled) return;
        setError(
          t.has("emptyMealSuggestError")
            ? t("emptyMealSuggestError")
            : "No encontramos una sugerencia ahora."
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mealType, premiumReady, t, userId]);

  const handleRefresh = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!userId || !premiumReady || isRefreshing || isAdding) return;
    setIsRefreshing(true);
    await loadSuggestion({
      preferAi: true,
      excludeExtra: suggestion ? [suggestion.recipeId] : []
    });
  };

  const handleAddToPlan = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!userId || !suggestion || isAdding) return;

    setIsAdding(true);
    setError(null);
    try {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const meal = await assignRecipeToPlan({
        userId,
        diaSemana: getWeekDayFromDate(today),
        tipoComida: mealType,
        recipeId: suggestion.recipeId,
        semanaInicioISO: toISODateString(getMondayOfWeek(today))
      });
      if (!meal) {
        setError(
          t.has("emptyMealAddError")
            ? t("emptyMealAddError")
            : "No pudimos añadir la receta al plan."
        );
        return;
      }
      notifyAdded();
      onAssigned?.();
    } catch {
      setError(
        t.has("emptyMealAddError")
          ? t("emptyMealAddError")
          : "No pudimos añadir la receta al plan."
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenDetail = () => {
    if (!suggestion || isLoading || isRefreshing) return;
    setDetailOpen(true);
  };

  const addLabel = t.has("emptyMealAddCta") ? t("emptyMealAddCta") : "Añadir al plan";
  const planChip = t.has("emptyMealPlanChip") ? t("emptyMealPlanChip") : "Planificar";
  const fallbackPrompt = t.has("emptyMealPrompt")
    ? t("emptyMealPrompt", { meal: slotLabel })
    : `¿Qué comerás en el ${slotLabel}?`;
  const hint = t.has("emptyMealHint") ? t("emptyMealHint") : "Toca para planificar";

  if (!userId) {
    return (
      <Link
        href={APP_ROUTES.plan}
        className={cn(
          "group flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/70 bg-gradient-to-br p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
          style.gradient,
          className
        )}
      >
        <div className="flex items-start justify-between gap-1">
          <span className="text-2xl leading-none" aria-hidden>
            {style.emoji}
          </span>
          <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-stone-600 shadow-sm">
            {slotLabel}
          </span>
        </div>
        <p className={cn("mt-2 line-clamp-2 text-[12px] font-bold leading-snug", style.accent)}>
          {fallbackPrompt}
        </p>
        <p className="mt-0.5 text-[10px] font-medium text-stone-500">{hint}</p>
        <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#3e5219] shadow-sm ring-1 ring-[#556B2F]/15">
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          {planChip}
        </span>
      </Link>
    );
  }

  if (isPremiumLoading) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/70 bg-gradient-to-br p-2 shadow-sm",
          style.gradient,
          className
        )}
      >
        <div className="mt-2 flex flex-1 flex-col gap-2 animate-pulse">
          <div className="h-7 w-16 rounded-full bg-white/55" />
          <div className="h-[4.25rem] rounded-lg bg-white/55" />
          <div className="h-3 w-4/5 rounded bg-white/60" />
          <div className="mt-auto h-7 w-24 rounded-full bg-white/70" />
        </div>
      </div>
    );
  }

  if (!premiumReady) {
    return (
      <>
        <FreeEmptyMealCard
          mealType={mealType}
          slotLabel={slotLabel}
          className={className}
          onUnlockPremium={() => setPaywallOpen(true)}
        />
        <PremiumUpgradeDialog
          open={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          onUpgraded={() => {
            setPaywallOpen(false);
            void refreshPremium();
          }}
          featureLabel={
            t.has("emptyMealPaywallFeature")
              ? t("emptyMealPaywallFeature")
              : "Desbloquea sugerencias inteligentes de recetas"
          }
        />
      </>
    );
  }

  return (
    <>
      <div
        role={suggestion ? "button" : undefined}
        tabIndex={suggestion ? 0 : undefined}
        onClick={suggestion ? handleOpenDetail : undefined}
        onKeyDown={
          suggestion
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleOpenDetail();
                }
              }
            : undefined
        }
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/70 bg-gradient-to-br p-2 shadow-sm outline-none",
          style.gradient,
          suggestion && "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md",
          className
        )}
      >
        <div className="flex items-start justify-between gap-1">
          <span className="rounded-full bg-white/85 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-stone-600 shadow-sm">
            {slotLabel}
          </span>
          <button
            type="button"
            onClick={(event) => void handleRefresh(event)}
            disabled={isRefreshing || isLoading || isAdding}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#556B2F] shadow-sm ring-1 ring-[#556B2F]/15 transition hover:bg-white disabled:opacity-60"
            aria-label={
              t.has("emptyMealRefreshAria")
                ? t("emptyMealRefreshAria")
                : "Otra sugerencia con IA"
            }
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {isLoading || (isRefreshing && !suggestion) ? (
          <div className="mt-2 flex flex-1 flex-col gap-2 animate-pulse">
            <div className="h-[4.25rem] rounded-lg bg-white/55" />
            <div className="h-3 w-4/5 rounded bg-white/60" />
            <div className="h-2.5 w-2/5 rounded bg-white/50" />
            <div className="mt-auto h-7 w-24 rounded-full bg-white/70" />
          </div>
        ) : suggestion ? (
          <>
            <div className="relative mt-1.5 h-[4.25rem] overflow-hidden rounded-lg bg-white/40">
              {suggestion.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={suggestion.imageUrl}
                  alt={suggestion.title}
                  className={cn(
                    "h-full w-full object-cover transition duration-300",
                    isRefreshing && "opacity-50"
                  )}
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-2xl" aria-hidden>
                    {style.emoji}
                  </span>
                </div>
              )}
              {isRefreshing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/35 backdrop-blur-[1px]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
                </div>
              ) : null}
            </div>

            <p
              className={cn(
                "mt-1.5 line-clamp-2 text-[11px] font-bold leading-snug",
                style.accent,
                isRefreshing && "opacity-60"
              )}
            >
              {suggestion.title}
            </p>

            <div className="mt-1 flex flex-wrap gap-1">
              {suggestion.kcal != null ? (
                <span className="rounded-full bg-white/85 px-1.5 py-0.5 text-[8px] font-semibold text-stone-600">
                  {suggestion.kcal} kcal
                </span>
              ) : null}
              {suggestion.proteinGrams != null ? (
                <span className="rounded-full bg-white/85 px-1.5 py-0.5 text-[8px] font-semibold text-stone-600">
                  {suggestion.proteinGrams}g Prot
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={(event) => void handleAddToPlan(event)}
              disabled={isAdding || isRefreshing}
              className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-[#556B2F] px-2 py-1 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#3e5219] disabled:opacity-60"
            >
              {isAdding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" strokeWidth={2.5} />
              )}
              {isAdding
                ? t.has("emptyMealAdding")
                  ? t("emptyMealAdding")
                  : "Añadiendo…"
                : addLabel}
            </button>
          </>
        ) : (
          <div className="mt-2 flex flex-1 flex-col">
            <div className="flex h-[4.25rem] items-center justify-center rounded-lg bg-white/45">
              <UtensilsCrossed className="h-5 w-5 text-stone-400" />
            </div>
            <p className={cn("mt-1.5 text-[11px] font-bold leading-snug", style.accent)}>
              {fallbackPrompt}
            </p>
            <Link
              href={APP_ROUTES.plan}
              onClick={(event) => event.stopPropagation()}
              className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#3e5219] shadow-sm ring-1 ring-[#556B2F]/15"
            >
              <Plus className="h-3 w-3" strokeWidth={2.5} />
              {planChip}
            </Link>
          </div>
        )}

        {error ? (
          <p className="mt-1 line-clamp-2 text-[9px] font-medium text-rose-700">{error}</p>
        ) : null}
      </div>

      <SuggestionRecipeDetailModal
        open={detailOpen}
        recipeId={suggestion?.recipeId ?? null}
        mealType={mealType}
        slotLabel={slotLabel}
        userId={userId}
        previewTitle={suggestion?.title}
        previewImageUrl={suggestion?.imageUrl}
        onClose={() => setDetailOpen(false)}
        onAdded={() => {
          notifyAdded();
          onAssigned?.();
        }}
      />
    </>
  );
}
