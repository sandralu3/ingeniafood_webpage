"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Coffee,
  Flame,
  Leaf,
  Loader2,
  Moon,
  Plus,
  Sparkles,
  type LucideIcon
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { HoyPageData } from "@/lib/gamification/hoy-page-data";
import { PlanSnacksSection } from "@/components/plan/plan-snacks-section";
import { Toast } from "@/components/ui/toast";
import type { MealType } from "@/lib/plan/constants";
import { MEAL_TYPES } from "@/lib/plan/constants";
import type { TodayPlanMealSummary } from "@/lib/plan/plan-nutrition";
import type { PlanSnack } from "@/lib/plan/snack-presets";
import { fillTodayPlanWithSuggestions } from "@/lib/plan/plan-service";
import { getTodayWeekDay } from "@/lib/plan/week-utils";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";
import { PremiumUpgradeDialog } from "@/components/premium/premium-upgrade-dialog";
import { usePremium } from "@/hooks/use-premium";

type TodayPlanNutritionProps = {
  data: HoyPageData | null;
  userId?: string | null;
  onPlanUpdated?: () => void;
  className?: string;
};

type MealSlot = {
  mealType: MealType;
  meal: TodayPlanMealSummary | null;
};

function mealLabelKey(mealType: MealType): "mealSlotBreakfast" | "mealSlotLunch" | "mealSlotDinner" {
  if (mealType === "Desayuno") return "mealSlotBreakfast";
  if (mealType === "Cena") return "mealSlotDinner";
  return "mealSlotLunch";
}

function resolveSlots(meals: HoyPageData["todayPlanMeals"] | undefined): MealSlot[] {
  if (meals && meals.length > 0) return meals;
  return MEAL_TYPES.map((mealType) => ({ mealType, meal: null }));
}

function orderMealSlots(slots: MealSlot[]): MealSlot[] {
  const byType = new Map(slots.map((slot) => [slot.mealType, slot]));
  return MEAL_TYPES.map((mealType) => byType.get(mealType) ?? { mealType, meal: null });
}

const SLOT_ICON: Record<MealType, LucideIcon> = {
  Desayuno: Coffee,
  Almuerzo: Leaf,
  Cena: Moon
};

function GenerateFullDayBanner({
  userId,
  isPremium,
  isPremiumLoading,
  isGenerating,
  onGenerate,
  onUnlockPremium
}: {
  userId: string | null | undefined;
  isPremium: boolean;
  isPremiumLoading: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onUnlockPremium: () => void;
}) {
  const t = useTranslations("Hoy");
  const premiumReady = Boolean(isPremium && !isPremiumLoading);

  const handleClick = () => {
    if (!userId) return;
    if (!premiumReady) {
      onUnlockPremium();
      return;
    }
    onGenerate();
  };

  const label = isGenerating
    ? t.has("todayMenuGenerating")
      ? t("todayMenuGenerating")
      : "Generando tu menú…"
    : t.has("proposeDayMenu")
      ? t("proposeDayMenu").replace(/✨/g, "").trim()
      : "Proponer menú del día";

  const sharedClass =
    "flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200/60 bg-white py-2.5 px-3 text-center text-xs font-semibold text-stone-700 shadow-sm shadow-stone-200/50 transition hover:bg-stone-50 disabled:cursor-wait disabled:opacity-70";

  if (!userId) {
    return (
      <Link href={APP_ROUTES.plan} className={sharedClass}>
        <Sparkles className="h-3.5 w-3.5 text-[#F9A825]" strokeWidth={1.75} />
        <span>
          {t.has("todayMenuGenerateCta")
            ? t("todayMenuGenerateCta").replace(/✨/g, "").trim()
            : "Proponer menú del día"}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
          Pro
        </span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isGenerating || isPremiumLoading}
      className={sharedClass}
    >
      {isGenerating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-500" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 text-[#F9A825]" strokeWidth={1.75} />
      )}
      <span>{label}</span>
      {!premiumReady && !isGenerating ? (
        <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
          Pro
        </span>
      ) : null}
    </button>
  );
}

const SLOT_PLACEHOLDER: Record<MealType, string> = {
  Desayuno: "from-amber-50 to-orange-100",
  Almuerzo: "from-emerald-50 to-lime-100",
  Cena: "from-stone-100 to-stone-200"
};

function MealPhotoCard({
  mealType,
  meal,
  isGenerating = false
}: {
  mealType: MealType;
  meal: TodayPlanMealSummary | null;
  isGenerating?: boolean;
}) {
  const t = useTranslations("Hoy");
  const slotLabel = t.has(mealLabelKey(mealType)) ? t(mealLabelKey(mealType)) : mealType;
  const Icon = SLOT_ICON[mealType];
  const href = meal?.recipeId
    ? `/app-recetas/recipes/${meal.recipeId}`
    : APP_ROUTES.plan;
  const unplanned = t.has("mealUnplanned") ? t("mealUnplanned") : "Sin planificar";

  return (
    <Link
      href={href}
      className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm shadow-stone-200/40 transition hover:shadow-md"
      role="listitem"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        {meal?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meal.imageUrl}
            alt={meal.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br",
              SLOT_PLACEHOLDER[mealType]
            )}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#3E5A3A]" />
            ) : (
              <Icon className="h-6 w-6 text-stone-400/70" strokeWidth={1.4} />
            )}
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-stone-700 shadow-sm backdrop-blur-sm">
          {slotLabel}
        </span>
      </div>

      <div className="px-2 pb-2 pt-1.5">
        <p className="line-clamp-2 min-h-[2rem] text-[11px] font-bold leading-snug text-stone-800">
          {meal
            ? meal.title
            : isGenerating
              ? t.has("todayMenuGenerating")
                ? t("todayMenuGenerating")
                : "Generando…"
              : unplanned}
        </p>
        {meal?.kcal != null ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-stone-500">
            <Flame className="h-3 w-3 text-[#F9A825]" strokeWidth={2} />
            {meal.kcal} kcal
          </p>
        ) : !isGenerating ? (
          <span className="mt-1.5 inline-flex items-center gap-0.5 rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-semibold text-stone-700">
            <Plus className="h-2.5 w-2.5" strokeWidth={2.5} />
            Añadir
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function TodayMealGrid({
  slots,
  isGeneratingFullDay = false
}: {
  slots: MealSlot[];
  isGeneratingFullDay?: boolean;
}) {
  const ordered = useMemo(() => orderMealSlots(slots), [slots]);
  const t = useTranslations("Hoy");

  return (
    <div
      className="grid grid-cols-3 gap-2 sm:gap-3"
      role="list"
      aria-label={t.has("todayMenuTitle") ? t("todayMenuTitle") : t("todayPlan")}
    >
      {ordered.map(({ mealType, meal }) => (
        <MealPhotoCard
          key={mealType}
          mealType={mealType}
          meal={meal}
          isGenerating={isGeneratingFullDay}
        />
      ))}
    </div>
  );
}

function TodayMenuSection({
  slots,
  snacks,
  weekStartISO,
  totalKcal,
  plannedCount,
  userId,
  onPlanUpdated,
  className
}: {
  slots: MealSlot[];
  snacks: PlanSnack[];
  weekStartISO: string;
  totalKcal: number;
  plannedCount: number;
  userId?: string | null;
  onPlanUpdated?: () => void;
  className?: string;
}) {
  const t = useTranslations("Hoy");
  const { isPremium, isLoading: isPremiumLoading, refresh: refreshPremium } = usePremium();
  const [isGeneratingFullDay, setIsGeneratingFullDay] = useState(false);
  const [showPremiumPaywall, setShowPremiumPaywall] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuToast, setMenuToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: ""
  });
  const [localSnacks, setLocalSnacks] = useState<PlanSnack[]>(snacks);

  useEffect(() => {
    setLocalSnacks(snacks);
  }, [snacks]);

  const title = t.has("todayMenuTitle") ? t("todayMenuTitle") : t("todayPlan");
  const hasEmptySlots = plannedCount < MEAL_TYPES.length;

  useEffect(() => {
    if (!menuToast.visible) return;
    const timer = window.setTimeout(() => {
      setMenuToast((prev) => ({ ...prev, visible: false }));
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [menuToast.visible]);

  const baseSnackKcal = snacks.reduce((sum, snack) => sum + snack.kcal, 0);
  const localSnackKcal = localSnacks.reduce((sum, snack) => sum + snack.kcal, 0);
  const displayKcal = totalKcal - baseSnackKcal + localSnackKcal;

  const handleGenerateFullDay = async () => {
    if (!userId || isGeneratingFullDay) return;
    setIsGeneratingFullDay(true);
    setMenuError(null);
    try {
      const result = await fillTodayPlanWithSuggestions({ userId, forceReplace: false });
      if (result.assigned === 0) {
        setMenuError(
          t.has("todayMenuGenerateEmpty")
            ? t("todayMenuGenerateEmpty")
            : "No encontramos recetas para completar el menú."
        );
        return;
      }
      setMenuToast({
        visible: true,
        message: t.has("dayMenuSuggestedSuccess")
          ? t("dayMenuSuggestedSuccess")
          : "Menú del día sugerido con éxito"
      });
      onPlanUpdated?.();
    } catch {
      setMenuError(
        t.has("todayMenuGenerateError")
          ? t("todayMenuGenerateError")
          : "No pudimos generar el menú. Inténtalo de nuevo."
      );
    } finally {
      setIsGeneratingFullDay(false);
    }
  };

  return (
    <section className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="text-base font-bold text-stone-800">{title}</h2>
        <Link
          href={APP_ROUTES.plan}
          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 transition hover:text-[#3E5A3A]"
        >
          <Flame className="h-3.5 w-3.5 text-[#F9A825]" strokeWidth={2} />
          {displayKcal} kcal
          <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
          <span className="text-[#3E5A3A]">{t("viewPlan")}</span>
        </Link>
      </div>

      {hasEmptySlots ? (
        <>
          <GenerateFullDayBanner
            userId={userId}
            isPremium={isPremium}
            isPremiumLoading={isPremiumLoading}
            isGenerating={isGeneratingFullDay}
            onGenerate={() => void handleGenerateFullDay()}
            onUnlockPremium={() => setShowPremiumPaywall(true)}
          />
          {menuError ? (
            <p className="text-center text-[10px] text-rose-600">{menuError}</p>
          ) : null}
        </>
      ) : null}

      <TodayMealGrid slots={slots} isGeneratingFullDay={isGeneratingFullDay} />

      {weekStartISO && localSnacks.length > 0 ? (
        <div className="rounded-[20px] border border-stone-100 bg-white p-3 shadow-sm shadow-stone-200/50">
          <PlanSnacksSection
            dayLabel={getTodayWeekDay()}
            weekStartISO={weekStartISO}
            snacks={localSnacks}
            readOnly
            compact
          />
        </div>
      ) : null}

      <PremiumUpgradeDialog
        open={showPremiumPaywall}
        onClose={() => setShowPremiumPaywall(false)}
        onUpgraded={() => void refreshPremium()}
        featureLabel={
          t.has("proposeDayMenuFeature")
            ? t("proposeDayMenuFeature")
            : "Proponer menú del día con IA"
        }
      />

      <Toast message={menuToast.message} visible={menuToast.visible} variant="success" />
    </section>
  );
}

/**
 * Plan / menú de hoy: carrusel visual Desayuno · Almuerzo · Cena + snacks.
 */
export function TodayPlanNutrition({
  data,
  userId = null,
  onPlanUpdated,
  className
}: TodayPlanNutritionProps) {
  const nutrition = data?.todayPlanNutrition;
  const plannedCount = nutrition?.plannedMealCount ?? 0;
  const slots = resolveSlots(data?.todayPlanMeals);

  return (
    <TodayMenuSection
      className={className}
      slots={slots}
      snacks={data?.todayPlanSnacks ?? []}
      weekStartISO={data?.weekStartISO ?? ""}
      plannedCount={plannedCount}
      totalKcal={nutrition?.totalKcal ?? 0}
      userId={userId}
      onPlanUpdated={onPlanUpdated}
    />
  );
}
