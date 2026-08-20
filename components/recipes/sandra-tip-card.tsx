"use client";

import { AlertTriangle, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { inferAdvisoryTone } from "@/components/recipes/recipe-advisory-alert";
import { cn } from "@/lib/utils";

type Props = {
  tip: string;
  /** Oculta en captura de imagen (se muestra en el bloque de branding) */
  hideOnShareCapture?: boolean;
  /**
   * `sandra` — tip de generación de receta.
   * `advisory` — info/warning de comida escaneada o registrada.
   */
  variant?: "sandra" | "advisory";
};

export function SandraTipCard({
  tip,
  hideOnShareCapture = false,
  variant = "sandra"
}: Props) {
  const t = useTranslations("RecipeDetail");
  const trimmed = tip.trim();
  if (!trimmed) return null;

  if (variant === "advisory") {
    const tone = inferAdvisoryTone(trimmed);
    const isWarning = tone === "warning";
    const Icon = isWarning ? AlertTriangle : Info;
    const eyebrow = isWarning
      ? t.has("advisoryWarningEyebrow")
        ? t("advisoryWarningEyebrow")
        : "Advertencia"
      : t.has("advisoryInfoEyebrow")
        ? t("advisoryInfoEyebrow")
        : "Información";
    const title = isWarning
      ? t.has("advisoryWarningTitle")
        ? t("advisoryWarningTitle")
        : "Nota nutricional"
      : t.has("advisoryInfoTitle")
        ? t("advisoryInfoTitle")
        : "Nota nutricional";

    return (
      <aside
        {...(hideOnShareCapture ? { "data-share-exclude": true } : {})}
        className={cn(
          "rounded-2xl p-3 shadow-sm",
          isWarning
            ? "bg-gradient-to-br from-amber-50 via-white to-amber-50/60 shadow-amber-100/40"
            : "bg-gradient-to-br from-sky-50 via-white to-stone-50 shadow-stone-100/40"
        )}
      >
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
          <Icon
            className={cn("h-3 w-3", isWarning ? "text-amber-600" : "text-sky-600")}
            strokeWidth={2.25}
            aria-hidden
          />
          {eyebrow}
        </p>
        <h3 className="mt-0.5 font-serif text-sm font-semibold text-stone-900">{title}</h3>
        <p className="mt-2 text-[11px] leading-relaxed text-stone-600">{trimmed}</p>
      </aside>
    );
  }

  return (
    <aside
      {...(hideOnShareCapture ? { "data-share-exclude": true } : {})}
      className="rounded-2xl bg-gradient-to-br from-[#EEF4E6] via-white to-[#dce7c3]/50 p-3 shadow-sm shadow-[#556B2F]/5"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
        {t("sandraTipEyebrow")}
      </p>
      <h3 className="mt-0.5 font-serif text-sm font-semibold text-stone-900">
        {t("sandraTipTitle")}
      </h3>
      <p className="mt-2 text-[11px] leading-relaxed text-stone-600">{trimmed}</p>
    </aside>
  );
}
