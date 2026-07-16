"use client";

import { useTranslations } from "next-intl";

type Props = {
  tip: string;
  /** Oculta en captura de imagen (se muestra en el bloque de branding) */
  hideOnShareCapture?: boolean;
};

export function SandraTipCard({ tip, hideOnShareCapture = false }: Props) {
  const t = useTranslations("RecipeDetail");

  if (!tip.trim()) return null;

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
      <p className="mt-2 text-[11px] leading-relaxed text-stone-600">{tip}</p>
    </aside>
  );
}
