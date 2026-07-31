"use client";

import { useState } from "react";
import { Cookie, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { SnackRegisterModal } from "@/components/plan/snack-register-modal";
import { PlanSectionDivider } from "@/components/plan/plan-section-divider";
import type { WeekDay } from "@/lib/plan/constants";
import type { PlanSnack } from "@/lib/plan/snack-presets";
import { SNACK_PRESETS } from "@/lib/plan/snack-presets";
import { addQuickSnackToPlan, removeSnackFromPlan } from "@/lib/plan/snack-service";
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
              <span className="shrink-0 text-[12px] leading-none" aria-hidden>
                {snack.emoji?.trim() || (
                  <Cookie className="h-3 w-3 text-[#C27803]" strokeWidth={1.75} />
                )}
              </span>
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
  className
}: Props) {
  const t = useTranslations("Plan");
  const [modalOpen, setModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [quickBusyId, setQuickBusyId] = useState<string | null>(null);

  const isHoy = variant === "hoy";
  const canRegister =
    !readOnly &&
    (canRegisterProp ?? canRegisterExternalMealForPlanDay(weekStartISO, dayLabel));

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

  const handleQuickChip = async (presetId: string) => {
    if (!canRegister || quickBusyId) return;
    setQuickBusyId(presetId);
    try {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        onError?.("Inicia sesión para registrar el snack.");
        return;
      }
      const result = await addQuickSnackToPlan({
        userId: user.id,
        dayLabel,
        weekStartISO,
        presetId
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

  return (
    <div className={cn(className)}>
      <PlanSectionDivider
        label={sectionLabel}
        accent={SNACK_ACCENT}
        className={compact ? "mb-1" : undefined}
      />

      <div
        className={cn(
          "rounded-lg border border-stone-100/90 bg-white shadow-sm shadow-stone-100/20",
          compact ? "px-2 py-1.5" : "px-2.5 py-2"
        )}
      >
        {snacks.length > 0 ? (
          <ul className={cn(compact ? "space-y-1" : "space-y-1.5", !readOnly && canRegister ? "mb-2" : "")}>
            {snacks.map((snack) => (
              <li
                key={snack.id}
                className={cn(
                  "flex items-center gap-2 rounded-md bg-stone-50/80",
                  compact ? "px-1.5 py-1" : "px-2 py-1.5"
                )}
              >
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-full ring-1",
                    compact ? "h-6 w-6 text-xs" : "h-7 w-7 text-sm",
                    SNACK_ACCENT.iconCircleBg,
                    SNACK_ACCENT.iconRing
                  )}
                  aria-hidden
                >
                  {snack.emoji?.trim() || (
                    <Cookie
                      className={cn(
                        compact ? "h-3 w-3" : "h-3.5 w-3.5",
                        SNACK_ACCENT.iconText
                      )}
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-semibold text-stone-800",
                      compact ? "text-[11px]" : "text-xs"
                    )}
                  >
                    {snack.title}
                    {compact ? (
                      <span className="ml-1.5 font-medium text-stone-500">{snack.kcal} kcal</span>
                    ) : null}
                  </p>
                  {!compact ? (
                    <p className="text-[10px] font-medium text-stone-500">{snack.kcal} kcal</p>
                  ) : null}
                </div>
                {!readOnly ? (
                  <button
                    type="button"
                    disabled={removingId === snack.id}
                    onClick={() => void handleRemove(snack.id)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
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
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {SNACK_PRESETS.slice(0, 4).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={quickBusyId !== null}
                  onClick={() => void handleQuickChip(preset.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200/80 bg-stone-50 px-2 py-1 text-[10px] font-semibold text-stone-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 disabled:opacity-50"
                >
                  {preset.emoji} +{preset.title.split(" ")[0]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-stone-100 bg-[#FCFBFA] px-3 py-2 text-xs font-semibold text-stone-600 transition hover:border-amber-200 hover:bg-amber-50/60 hover:text-amber-900"
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full ring-1",
                  SNACK_ACCENT.iconCircleBg,
                  SNACK_ACCENT.iconRing,
                  SNACK_ACCENT.iconText
                )}
              >
                <Plus className="h-3 w-3" strokeWidth={2.25} />
              </span>
              {t.has("snackRegisterCta") ? t("snackRegisterCta") : "Registrar snack"}
              {snackKcal > 0 ? (
                <span className="text-[10px] font-medium text-stone-400">· {snackKcal} kcal</span>
              ) : null}
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

      {!readOnly ? (
        <SnackRegisterModal
          open={modalOpen}
          dayLabel={dayLabel}
          weekStartISO={weekStartISO}
          onClose={() => setModalOpen(false)}
          onRegistered={(snack) => {
            onSnackAdded?.(snack);
            setModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
