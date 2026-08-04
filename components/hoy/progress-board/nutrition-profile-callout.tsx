"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

type NutritionProfileCalloutProps = {
  variant?: "card" | "modal";
  className?: string;
  onNavigate?: () => void;
};

export function NutritionProfileCallout({
  variant = "modal",
  className,
  onNavigate
}: NutritionProfileCalloutProps) {
  const t = useTranslations("Hoy");
  const href = `${APP_ROUTES.parametros}#nutrition-goals`;

  const message = t.has("nutritionProfileCallout")
    ? t("nutritionProfileCallout")
    : "✨ Personaliza tu perfil (peso, estatura y objetivo) para recibir análisis y metas exactas para ti.";
  const cta = t.has("nutritionProfileCalloutCta")
    ? t("nutritionProfileCalloutCta")
    : "Personalizar parámetros →";

  if (variant === "card") {
    return (
      <Link
        href={href}
        onClick={(event) => {
          event.stopPropagation();
          onNavigate?.();
        }}
        className={cn(
          "mt-1 block rounded-lg bg-amber-50/90 px-1.5 py-1 text-[8px] font-semibold leading-snug text-amber-950 ring-1 ring-amber-100/90 transition hover:bg-amber-100/80",
          className
        )}
      >
        <span className="line-clamp-2">{message}</span>
        <span className="mt-0.5 block text-[#3e5219] underline-offset-2 hover:underline">
          {cta}
        </span>
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "mt-2.5 rounded-xl border border-amber-100/90 bg-amber-50/80 px-2.5 py-2",
        className
      )}
    >
      <p className="text-[10px] leading-snug text-stone-600">{message}</p>
      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-800/70">
        {t.has("nutritionProfilePremiumHint")
          ? t("nutritionProfilePremiumHint")
          : "Calibración del coach Premium"}
      </p>
      <Link
        href={href}
        onClick={onNavigate}
        className="mt-1.5 inline-flex items-center rounded-full bg-[#556B2F] px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-[#3e5219]"
      >
        {cta}
      </Link>
    </div>
  );
}
