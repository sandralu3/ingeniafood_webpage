"use client";

import { AlertTriangle, Info, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { inferAdvisoryTone } from "@/components/recipes/recipe-advisory-alert";
import { cn } from "@/lib/utils";

type Props = {
  tipSandra: string;
  /** Comidas escaneadas/registradas: info o warning, no Tip de Sandra. */
  variant?: "sandra" | "advisory";
};

/** Visible solo durante la captura (`recipe-share-capturing` en globals.css). */
export function RecipeShareBranding({ tipSandra, variant = "sandra" }: Props) {
  const t = useTranslations("RecipeDetail");
  const trimmed = tipSandra.trim();

  return (
    <div data-share-only className="mt-4 space-y-4">
      {trimmed ? (
        variant === "advisory" ? (
          <AdvisoryShareBlock message={trimmed} />
        ) : (
          <section className="rounded-xl border border-[#556B2F]/20 bg-[#F0F4ED] p-4">
            <p className="inline-flex items-center gap-2 text-sm font-bold tracking-wide text-[#556B2F]">
              <Sparkles className="h-4 w-4 shrink-0" />
              {t.has("shareSandraTipTitle")
                ? t("shareSandraTipTitle")
                : t("sandraTipEyebrow")}
            </p>
            <p className="mt-2 text-sm italic leading-relaxed text-sv-on-surface-variant">
              {trimmed}
            </p>
          </section>
        )
      ) : null}

      <footer className="border-t border-sv-outline-variant/20 pt-4">
        <p className="text-sm font-bold text-sv-primary">
          {t.has("shareGeneratedWith")
            ? t("shareGeneratedWith")
            : "Generado con IngeniaFood"}
        </p>
        <p className="mt-1 text-xs text-sv-on-surface-variant">
          {t.has("shareTagline")
            ? t("shareTagline")
            : "Tu asistente de cocina saludable"}
        </p>
      </footer>
    </div>
  );
}

function AdvisoryShareBlock({ message }: { message: string }) {
  const t = useTranslations("RecipeDetail");
  const tone = inferAdvisoryTone(message);
  const isWarning = tone === "warning";
  const Icon = isWarning ? AlertTriangle : Info;
  const title = isWarning
    ? t.has("advisoryWarningEyebrow")
      ? t("advisoryWarningEyebrow")
      : "Advertencia"
    : t.has("advisoryInfoEyebrow")
      ? t("advisoryInfoEyebrow")
      : "Información";

  return (
    <section
      className={cn(
        "rounded-xl border p-4",
        isWarning
          ? "border-amber-200 bg-amber-50"
          : "border-sky-200/80 bg-sky-50/90"
      )}
    >
      <p
        className={cn(
          "inline-flex items-center gap-2 text-sm font-bold tracking-wide",
          isWarning ? "text-amber-800" : "text-sky-800"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-700">{message}</p>
    </section>
  );
}
