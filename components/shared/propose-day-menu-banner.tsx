"use client";

import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

type ProposeDayMenuBannerProps = {
  isGenerating?: boolean;
  isPremium?: boolean;
  isPremiumLoading?: boolean;
  /** Hay al menos una comida ya asignada → texto "Completar…". */
  hasPartialPlan?: boolean;
  onGenerate: () => void;
  /** Si no es premium, se llama en lugar de onGenerate. */
  onUnlockPremium?: () => void;
  /** Si no hay usuario, el banner actúa como enlace (solo Hoy). */
  hrefWhenUnauthenticated?: string;
  className?: string;
};

/**
 * Banner "Proponer / Completar menú del día" — mismo diseño en Hoy y Plan semanal.
 */
export function ProposeDayMenuBanner({
  isGenerating = false,
  isPremium = false,
  isPremiumLoading = false,
  hasPartialPlan = false,
  onGenerate,
  onUnlockPremium,
  hrefWhenUnauthenticated,
  className
}: ProposeDayMenuBannerProps) {
  const tHoy = useTranslations("Hoy");
  const tPlan = useTranslations("Plan");
  const premiumReady = Boolean(isPremium && !isPremiumLoading);

  const handleClick = () => {
    if (!premiumReady) {
      if (onUnlockPremium) {
        onUnlockPremium();
        return;
      }
      // Si no hay callback de paywall, dejar que onGenerate decida (p. ej. Plan semanal).
    }
    onGenerate();
  };

  const title = isGenerating
    ? tHoy.has("todayMenuGenerating")
      ? tHoy("todayMenuGenerating")
      : tPlan.has("proposingDayMenu")
        ? tPlan("proposingDayMenu")
        : "Generando tu menú…"
    : hasPartialPlan
      ? tHoy.has("completeDayMenu")
        ? tHoy("completeDayMenu").replace(/✨/g, "").trim()
        : "Completar comidas que faltan"
      : tHoy.has("proposeDayMenu")
        ? tHoy("proposeDayMenu").replace(/✨/g, "").trim()
        : tPlan.has("proposeDayMenu")
          ? tPlan("proposeDayMenu").replace(/✨/g, "").trim()
          : "Proponer menú del día";

  const sharedClass = cn(
    "flex w-full items-center gap-2 rounded-[18px] bg-[#F6E2C3] px-3 py-2 text-left transition hover:brightness-[0.98] disabled:cursor-wait disabled:opacity-70",
    className
  );

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

  if (hrefWhenUnauthenticated) {
    return (
      <Link href={hrefWhenUnauthenticated} className={sharedClass}>
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

/** Atajo tipado para el enlace de Hoy sin usuario. */
export const PROPOSE_DAY_MENU_FALLBACK_HREF = APP_ROUTES.plan;
