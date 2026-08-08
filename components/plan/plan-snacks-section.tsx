"use client";

import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlanSectionDivider } from "@/components/plan/plan-section-divider";
import type { WeekDay } from "@/lib/plan/constants";
import {
  fetchSnackSuggestionsForUser,
  type SnackSuggestion
} from "@/lib/plan/frequent-snacks";
import type { PlanSnack } from "@/lib/plan/snack-presets";
import { SNACK_PRESETS } from "@/lib/plan/snack-presets";
import { addSuggestedSnackToPlan, removeSnackFromPlan } from "@/lib/plan/snack-service";
import { canRegisterExternalMealForPlanDay } from "@/lib/plan/week-utils";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type Props = {
  dayLabel: WeekDay;
  weekStartISO: string;
  snacks: PlanSnack[];
  /** Si true, solo muestra snacks (sin chips ni registro). Enlace a Plan para añadir. */
  readOnly?: boolean;
  /** Layout denso legacy; preferir `variant="hoy"` en el dashboard. */
  compact?: boolean;
  /** Variante visual alineada con Plan de hoy (cabecera + mini-cards). */
  variant?: "default" | "hoy";
  canRegister?: boolean;
  onSnackAdded?: (snack: PlanSnack) => void;
  onSnackRemoved?: (snackId: string) => void;
  onError?: (message: string) => void;
  /** Abre el modal de registro (montado fuera del panel, como el picker de recetas). */
  onOpenRegister?: () => void;
  className?: string;
};

/** Acento propio (ámbar dorado), distinto de Desayuno/Almuerzo/Cena. */
const SNACK_ACCENT = {
  dividerText: "text-amber-700",
  dividerLine: "bg-amber-300",
  iconCircleBg: "bg-amber-50",
  iconRing: "ring-amber-200",
  iconText: "text-amber-700"
} as const;

function HoySnacksLayout({
  snacks,
  className
}: {
  snacks: PlanSnack[];
  className?: string;
}) {
  const tPlan = useTranslations("Plan");
  const title = tPlan.has("snacksHoyTitle")
    ? tPlan("snacksHoyTitle")
    : "Snacks";

  return (
    <div className={cn("space-y-1.5", className)}>
      <h3 className="px-0.5 text-xs font-semibold tracking-wide text-stone-500">
        {title}
      </h3>

      <ul className="flex flex-wrap gap-1.5" aria-label={title}>
        {snacks.map((snack) => (
          <li
            key={snack.id}
            className="min-w-[calc(33.333%-0.375rem)] flex-1"
          >
            <span className="flex w-full items-center justify-center gap-1 rounded-full bg-[#F3F0E8]/90 px-2.5 py-1.5 text-[11px] text-stone-700">
              {snack.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={snack.imageUrl}
                  alt=""
                  className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-stone-200/80"
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <span className="shrink-0 text-[12px] leading-none" aria-hidden>
                  {snack.emoji?.trim() || (
                    <Cookie className="h-3 w-3 text-[#C27803]" strokeWidth={1.75} />
                  )}
                </span>
              )}
              <span className="truncate font-medium">{snack.title}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlanSnacksSection({
  dayLabel,
  weekStartISO,
  snacks,
  readOnly = false,
  compact = false,
  variant = "default",
  canRegister: canRegisterProp,
  onSnackAdded,
  onSnackRemoved,
  onError,
  onOpenRegister,
  className
}: Props) {
  const t = useTranslations("Plan");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [quickBusyId, setQuickBusyId] = useState<string | null>(null);
  const [chipSuggestions, setChipSuggestions] = useState<SnackSuggestion[]>(() =>
    SNACK_PRESETS.slice(0, 4).map((preset) => ({
      id: `preset:${preset.id}`,
      emoji: preset.emoji,
      title: preset.title,
      kcal: preset.kcal,
      proteinGrams: preset.proteinGrams,
      carbsGrams: preset.carbsGrams,
      fatGrams: preset.fatGrams,
      origin: "preset" as const
    }))
  );

  const isHoy = variant === "hoy";
  const canRegister =
    !readOnly &&
    (canRegisterProp ?? canRegisterExternalMealForPlanDay(weekStartISO, dayLabel));

  useEffect(() => {
    if (readOnly || isHoy) return;

    let cancelled = false;
    const load = async () => {
      try {
        const supabase = createSupabaseClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) return;
        const next = await fetchSnackSuggestionsForUser(user.id, { limit: 4 });
        if (!cancelled) setChipSuggestions(next);
      } catch (error) {
        console.warn("[plan-snacks] suggestions", error);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isHoy, readOnly, snacks.length]);

  const snackKcal = snacks.reduce((sum, snack) => sum + snack.kcal, 0);
  const sectionLabel = t.has("snacksSectionLabel")
    ? t("snacksSectionLabel")
    : "Snacks / Tentempié";

  // En Hoy, no mostrar bloque vacío (ahorra espacio vertical).
  if ((isHoy || (compact && readOnly)) && snacks.length === 0) {
    return null;
  }

  if (isHoy) {
    return <HoySnacksLayout snacks={snacks} className={className} />;
  }

  const handleRemove = async (snackId: string) => {
    if (readOnly || removingId) return;
    setRemovingId(snackId);
    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        onError?.("Inicia sesión para eliminar el snack.");
        return;
      }
      const result = await removeSnackFromPlan({ userId: user.id, snackId });
      if ("error" in result) {
        onError?.(result.error);
        return;
      }
      onSnackRemoved?.(snackId);
    } catch (error) {
      console.error("[plan-snacks] remove", error);
      onError?.("No pudimos eliminar el snack.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleQuickChip = async (suggestion: SnackSuggestion) => {
    if (!canRegister || quickBusyId) return;
    setQuickBusyId(suggestion.id);
    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        onError?.("Inicia sesión para registrar el snack.");
        return;
      }
      const result = await addSuggestedSnackToPlan({
        userId: user.id,
        dayLabel,
        weekStartISO,
        suggestion
      });
      if ("error" in result) {
        onError?.(result.error);
        return;
      }
      onSnackAdded?.(result.snack);
    } catch (error) {
      console.error("[plan-snacks] quick", error);
      onError?.("No pudimos guardar el snack.");
    } finally {
      setQuickBusyId(null);
    }
  };

  const registerCta =
    snackKcal > 0
      ? t.has("snackRegisterCtaWithKcal")
        ? t("snackRegisterCtaWithKcal", { kcal: snackKcal })
        : `✨ + Registrar snack • ${snackKcal} kcal`
      : t.has("snackRegisterCtaPremium")
        ? t("snackRegisterCtaPremium")
        : "✨ + Registrar snack";

  return (
    <div className={cn(className)}>
      <PlanSectionDivider
        label={
          <>
            <span aria-hidden>🍪</span> {sectionLabel}
          </>
        }
        accent={SNACK_ACCENT}
        className={compact ? "mb-1" : undefined}
      />

      <div
        className={cn(
          "rounded-xl border border-stone-100/90 bg-white shadow-sm shadow-stone-100/20",
          compact ? "px-2 py-1.5" : "space-y-2.5 px-2.5 py-2.5"
        )}
      >
        {snacks.length > 0 ? (
          <ul className={cn(compact ? "space-y-1" : "space-y-2")}>
            {snacks.map((snack) => (
              <li
                key={snack.id}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-xl border border-stone-100/80 bg-[#FBF8F3]/90",
                  compact ? "px-1.5 py-1" : "px-2.5 py-2"
                )}
              >
                <span
                  className={cn(
                    "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-stone-200/70",
                    compact ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm",
                    SNACK_ACCENT.iconCircleBg
                  )}
                  aria-hidden
                >
                  {snack.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={snack.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  ) : snack.emoji?.trim() ? (
                    snack.emoji
                  ) : (
                    <Cookie
                      className={cn(
                        compact ? "h-3.5 w-3.5" : "h-4 w-4",
                        SNACK_ACCENT.iconText
                      )}
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1 pr-6">
                  <p className="truncate text-xs font-bold text-stone-800">{snack.title}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-stone-500">
                    {snack.kcal} kcal
                  </p>
                </div>
                {!readOnly ? (
                  <button
                    type="button"
                    disabled={removingId === snack.id}
                    onClick={() => void handleRemove(snack.id)}
                    className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    aria-label={`Eliminar ${snack.title}`}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {readOnly ? (
          snacks.length === 0 ? (
            <p className="px-1 py-1.5 text-center text-[11px] text-stone-500">
              {t.has("snackHoyEmpty")
                ? t("snackHoyEmpty")
                : "Aún no hay snacks registrados hoy."}
            </p>
          ) : snackKcal > 0 && !compact ? (
            <p className="mt-1.5 px-1 text-[10px] font-medium text-stone-500">
              {snackKcal} kcal en snacks
            </p>
          ) : null
        ) : canRegister ? (
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {chipSuggestions.map((suggestion) => {
                const chipLabel = suggestion.title.split(" ")[0] ?? suggestion.title;
                return (
                  <button
                    key={suggestion.id}
                    type="button"
                    disabled={quickBusyId !== null}
                    onClick={() => void handleQuickChip(suggestion)}
                    className="inline-flex items-center gap-1 rounded-full border border-stone-200/70 bg-stone-100/90 px-2.5 py-1.5 text-[10px] font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-200/70 hover:text-stone-800 disabled:opacity-50"
                  >
                    {suggestion.emoji ? (
                      <span className="text-[11px] leading-none" aria-hidden>
                        {suggestion.emoji}
                      </span>
                    ) : null}
                    <span>+ {chipLabel}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => onOpenRegister?.()}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#2d4a27] px-3 py-2.5 text-xs font-semibold text-[#F5E6C8] shadow-sm shadow-[#2d4a27]/25 transition hover:bg-[#243d1f] active:scale-[0.99]"
            >
              {registerCta}
            </button>
          </div>
        ) : snacks.length === 0 ? (
          <p className="px-1 py-1.5 text-center text-[11px] text-stone-500">
            {t.has("snackFutureDayHint")
              ? t("snackFutureDayHint")
              : "Los snacks se registran en hoy o días pasados."}
          </p>
        ) : snackKcal > 0 ? (
          <p className="px-1 text-[10px] font-medium text-stone-500">{snackKcal} kcal en snacks</p>
        ) : null}
      </div>
    </div>
  );
}
