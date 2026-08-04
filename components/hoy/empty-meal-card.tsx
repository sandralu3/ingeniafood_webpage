"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode
} from "react";
import Link from "next/link";
import {
  Coffee,
  Leaf,
  Loader2,
  Moon,
  Plus,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon
} from "lucide-react";
import { useTranslations } from "next-intl";
import { SuggestionRecipeDetailModal } from "@/components/hoy/suggestion-recipe-detail-modal";
import { usePremium } from "@/hooks/use-premium";
import type { MealType } from "@/lib/plan/constants";
import { assignRecipeToPlan } from "@/lib/plan/plan-service";
import type { MealSuggestion, RemainingMacros } from "@/lib/plan/meal-suggestion";
import {
  clearDailySlotSuggestion,
  readDailySlotSuggestion,
  writeDailySlotSuggestion
} from "@/lib/plan/daily-slot-suggestion-cache";
import {
  getMondayOfWeek,
  getWeekDayFromDate,
  toISODateString
} from "@/lib/plan/week-utils";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

const SLOT_ICON: Record<MealType, LucideIcon> = {
  Desayuno: Coffee,
  Almuerzo: Leaf,
  Cena: Moon
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

function MealSlotShell({
  mealType,
  slotLabel,
  className,
  children,
  as: Comp = "div",
  href,
  onClick,
  role,
  tabIndex,
  onKeyDown
}: {
  mealType: MealType;
  slotLabel: string;
  className?: string;
  children: ReactNode;
  as?: "div" | typeof Link;
  href?: string;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (event: KeyboardEvent) => void;
}) {
  const Icon = SLOT_ICON[mealType];
  const shared = cn(
    "relative flex h-full w-full flex-col rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-slate-200 hover:shadow-md",
    className
  );

  const body = (
    <>
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {slotLabel}
        </span>
      </div>
      <div className="mt-2 flex min-h-0 flex-1 flex-col">{children}</div>
    </>
  );

  if (Comp === Link && href) {
    return (
      <Link href={href} className={shared}>
        {body}
      </Link>
    );
  }

  return (
    <div
      role={role}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={shared}
    >
      {body}
    </div>
  );
}

function PlanificarButton({
  label,
  className
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-xl bg-[#2D3A20] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm",
        className
      )}
    >
      <Plus className="h-3 w-3" strokeWidth={2.5} />
      {label}
    </span>
  );
}

function FreeEmptyMealCard({
  mealType,
  slotLabel,
  className
}: {
  mealType: MealType;
  slotLabel: string;
  className?: string;
}) {
  const t = useTranslations("Hoy");
  const planLabel = t.has("emptyMealPlanChip") ? t("emptyMealPlanChip") : "Planificar";

  return (
    <MealSlotShell mealType={mealType} slotLabel={slotLabel} className={className}>
      <div className="mt-auto">
        <Link href={APP_ROUTES.plan} className="w-fit">
          <PlanificarButton label={planLabel} />
        </Link>
      </div>
    </MealSlotShell>
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
    isLoading: isPremiumLoading
  } = usePremium();
  const premiumReady = Boolean(isPremium && !isPremiumLoading);
  const [suggestion, setSuggestion] = useState<MealSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId) && premiumReady);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenIdsRef = useRef<string[]>([...excludeRecipeIds]);
  const remainingMacrosRef = useRef(remainingMacros);
  const excludeRecipeIdsRef = useRef(excludeRecipeIds);

  remainingMacrosRef.current = remainingMacros;
  excludeRecipeIdsRef.current = excludeRecipeIds;

  const notifyAdded = useCallback(() => {
    const message = t.has("emptyMealAddedToast")
      ? t("emptyMealAddedToast", { meal: slotLabel })
      : `¡Añadido a tu ${slotLabel} de hoy!`;
    onAddSuccess?.(message);
  }, [onAddSuccess, slotLabel, t]);

  const loadSuggestion = useCallback(
    async (opts?: { preferAi?: boolean; excludeExtra?: string[]; forceRefresh?: boolean }) => {
      if (!userId || !premiumReady) {
        setSuggestion(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (!opts?.forceRefresh) {
        const cached = readDailySlotSuggestion(userId, mealType);
        if (cached && !excludeRecipeIdsRef.current.includes(cached.recipeId)) {
          setSuggestion(cached);
          seenIdsRef.current = Array.from(
            new Set([...seenIdsRef.current, cached.recipeId])
          ).slice(-12);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
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
          writeDailySlotSuggestion(userId, mealType, next);
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

    const cached = readDailySlotSuggestion(userId, mealType);
    if (cached && !excludeRecipeIdsRef.current.includes(cached.recipeId)) {
      setSuggestion(cached);
      seenIdsRef.current = Array.from(
        new Set([...seenIdsRef.current, cached.recipeId])
      ).slice(-12);
      setIsLoading(false);
      setError(null);
      return;
    }

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
          writeDailySlotSuggestion(userId, mealType, next);
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
      forceRefresh: true,
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
      clearDailySlotSuggestion(userId, mealType);
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

  const addLabel = t.has("emptyMealAddCta") ? t("emptyMealAddCta") : "Añadir";
  const planLabel = t.has("emptyMealPlanChip") ? t("emptyMealPlanChip") : "Planificar";

  if (!userId) {
    return (
      <MealSlotShell
        mealType={mealType}
        slotLabel={slotLabel}
        className={className}
        as={Link}
        href={APP_ROUTES.plan}
      >
        <div className="mt-auto">
          <PlanificarButton label={planLabel} />
        </div>
      </MealSlotShell>
    );
  }

  if (isPremiumLoading) {
    return (
      <div
        className={cn(
          "flex h-full w-full animate-pulse flex-col rounded-2xl border border-slate-100 bg-white p-3 shadow-sm",
          className
        )}
      >
        <div className="h-3 w-16 rounded bg-slate-100" />
        <div className="mt-3 h-8 rounded bg-slate-100" />
        <div className="mt-auto h-7 w-20 rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (!premiumReady) {
    return (
      <FreeEmptyMealCard
        mealType={mealType}
        slotLabel={slotLabel}
        className={className}
      />
    );
  }

  return (
    <>
      <MealSlotShell
        mealType={mealType}
        slotLabel={slotLabel}
        className={cn(suggestion && "cursor-pointer", className)}
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
      >
        <div className="absolute right-2.5 top-2.5 z-10">
          <button
            type="button"
            onClick={(event) => void handleRefresh(event)}
            disabled={isRefreshing || isLoading || isAdding}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-[#556B2F] transition hover:bg-slate-100 disabled:opacity-60"
            aria-label={
              t.has("emptyMealRefreshAria")
                ? t("emptyMealRefreshAria")
                : "Otra sugerencia con IA"
            }
          >
            {isRefreshing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" strokeWidth={1.75} />
            )}
          </button>
        </div>

        {isLoading || (isRefreshing && !suggestion) ? (
          <div className="flex flex-1 animate-pulse flex-col gap-2">
            <div className="h-4 w-4/5 rounded bg-slate-100" />
            <div className="mt-auto h-7 w-16 rounded-xl bg-slate-100" />
          </div>
        ) : suggestion ? (
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 pr-5">
            <p
              className={cn(
                "line-clamp-2 text-[11px] font-bold leading-snug text-slate-800",
                isRefreshing && "opacity-60"
              )}
            >
              {suggestion.title}
            </p>
            <div className="flex items-center gap-2">
              {suggestion.kcal != null ? (
                <span className="text-[10px] font-medium tabular-nums text-slate-400">
                  {suggestion.kcal} kcal
                </span>
              ) : null}
              <button
                type="button"
                onClick={(event) => void handleAddToPlan(event)}
                disabled={isAdding || isRefreshing}
                className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#2D3A20] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#243018] disabled:opacity-60"
              >
                {isAdding ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" strokeWidth={2.5} />
                )}
                {isAdding
                  ? t.has("emptyMealAdding")
                    ? t("emptyMealAdding")
                    : "…"
                  : addLabel}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <UtensilsCrossed className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="text-[11px] text-slate-500">Sin sugerencia</span>
            </div>
            <Link
              href={APP_ROUTES.plan}
              onClick={(event) => event.stopPropagation()}
              className="w-fit"
            >
              <PlanificarButton label={planLabel} />
            </Link>
          </div>
        )}

        {error ? (
          <p className="mt-1 line-clamp-1 text-[10px] font-medium text-rose-600">{error}</p>
        ) : null}
      </MealSlotShell>

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
