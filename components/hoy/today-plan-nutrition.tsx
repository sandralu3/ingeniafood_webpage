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
  Sparkles
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

const SLOT_BADGE: Record<MealType, string> = {
  Desayuno: "bg-[#E8F0E4] text-[#3E5A3A]",
  Almuerzo: "bg-[#E8F0E4] text-[#3E5A3A]",
  Cena: "bg-[#EDE8F8] text-[#5B4B9A]"
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

  const title = isGenerating
    ? t.has("todayMenuGenerating")
      ? t("todayMenuGenerating")
      : "Generando tu menú…"
    : t.has("proposeDayMenu")
      ? t("proposeDayMenu").replace(/✨/g, "").trim()
      : "Proponer menú del día";

  const sharedClass =
    "flex w-full items-center gap-2 rounded-[18px] bg-[#F6E2C3] px-3 py-2 text-left transition hover:brightness-[0.98] disabled:cursor-wait disabled:opacity-70";

  const body = (
    <>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FDF3E3]">
        {isGenerating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C27803]" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-[#C27803]" strokeWidth={2} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] leading-none text-[#C27803]" aria-hidden>
            ✨
          </span>
          <p className="truncate text-[11px] font-bold leading-tight text-[#3D2E1F]">
            {title}
          </p>
          {!premiumReady && !isGenerating ? (
            <span className="shrink-0 rounded-md bg-[#EDE5D4] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#5C4A32]">
              Pro
            </span>
          ) : null}
        </div>
      </div>

      <span className="flex shrink-0 items-center gap-1.5">
        <span className="flex flex-col gap-[2px]" aria-hidden>
          <span className="h-px w-2 bg-[#C4B49A]/70" />
          <span className="h-px w-2 bg-[#C4B49A]/70" />
          <span className="h-px w-2 bg-[#C4B49A]/70" />
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#5C7A54] via-[#3E5A3A] to-[#2F452C] text-white shadow-sm shadow-[#3E5A3A]/20">
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
      </span>
    </>
  );

  if (!userId) {
    return (
      <Link href={APP_ROUTES.plan} className={sharedClass}>
        {body}
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
      {body}
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
  const PlannedIcon = mealType === "Desayuno" ? Coffee : mealType === "Cena" ? Moon : Leaf;
  const href = meal?.recipeId
    ? `/app-recetas/recipes/${meal.recipeId}`
    : APP_ROUTES.plan;
  const unplanned = t.has("mealUnplanned") ? t("mealUnplanned") : "Sin planificar";
  const addLabel = t.has("addMeal") ? t("addMeal") : "Añadir";

  /* —— Slot vacío compacto (misma altura que foto planificada) —— */
  if (!meal && !isGenerating) {
    return (
      <Link
        href={href}
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm shadow-stone-200/40 transition hover:shadow-md"
        role="listitem"
      >
        <div className="m-1.5 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/60 p-3 text-center transition-all hover:bg-stone-100/70">
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide",
              SLOT_BADGE[mealType]
            )}
          >
            {slotLabel}
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-stone-600 shadow-sm">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <span className="text-[10px] font-semibold text-stone-600">{addLabel}</span>
        </div>
      </Link>
    );
  }

  /* —— Con comida / generando —— */
  return (
    <Link
      href={href}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm shadow-stone-200/40 transition hover:shadow-md"
      role="listitem"
    >
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-stone-100">
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
              <PlannedIcon className="h-6 w-6 text-stone-400/70" strokeWidth={1.4} />
            )}
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-stone-700 shadow-sm backdrop-blur-sm">
          {slotLabel}
        </span>
      </div>

      <div className="mt-auto px-2 pb-2 pt-1.5">
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
      className="grid grid-cols-3 items-stretch gap-3"
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
        <h2 className="text-base font-bold text-[#3E5A3A]">{title}</h2>
        <Link
          href={APP_ROUTES.plan}
          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 transition hover:text-[#3E5A3A]"
        >
          <Flame className="h-3.5 w-3.5 text-[#F9A825]" strokeWidth={2} />
          {displayKcal} kcal
          <span className="text-[#3E5A3A]">{t("viewPlan")}</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#3E5A3A]" />
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
        <PlanSnacksSection
          dayLabel={getTodayWeekDay()}
          weekStartISO={weekStartISO}
          snacks={localSnacks}
          readOnly
          variant="hoy"
        />
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
