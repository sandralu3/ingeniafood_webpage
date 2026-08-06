"use client";

import { useEffect, useId, useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type AdvisoryTone = "warning" | "info";

export type BalanceAdvisory = {
  message: string;
  tone: AdvisoryTone;
  /** Título positivo del popup (p. ej. recommendation_title de la IA). */
  title?: string;
};

export function isRecipeAdvisoryAlert(message: string | null | undefined): boolean {
  return Boolean(message && message.trim().length > 0);
}

/**
 * Clasifica un aviso de texto libre (escáner / detalle guardado).
 * Advertencia: poco saludable, dieta incompatible, indulgente.
 * Información: tips suaves (proteína, verdura, omitidos, etc.).
 */
export function inferAdvisoryTone(message: string | null | undefined): AdvisoryTone {
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return "info";

  const WARNING_RE =
    /poco\s+saludable|no\s+es\s+un\s+alimento\s+saludable|no\s+son\s+alimentos\s+saludables|unhealthy|not\s+a\s+healthy|not\s+healthy|peu\s+sain|n'est\s+pas\s+un\s+aliment\s+sain|pouco\s+saud[aá]vel|n[aã]o\s+[eé]\s+um\s+alimento\s+saud[aá]vel|ungesund|kein\s+gesundes|ultraproces|ultra[\s-]?process|ten\s+en\s+cuenta|nota\s+de\s+dieta|diet\s+note|note\s+r[eé]gime|di[aä]t[\s-]?hinweis|indulgente|poco\s+recomendable|poco\s+equilibrado|bastante\s+cal[oó]rico|muy\s+cal[oó]rico|moderaci[oó]n|consom[ea].*moderaci|enjoy.*moderation|snack\s+indulgente|comida\s+r[aá]pida|fast\s+food|atenci[oó]n\s*:|attention\s*:|aten[cç][aã]o\s*:/i;

  return WARNING_RE.test(text) ? "warning" : "info";
}

type PulseButtonProps = {
  message: string;
  /** Por defecto se infiere del texto. */
  tone?: AdvisoryTone;
  /** Título del popup (recomendación positiva). */
  title?: string;
  className?: string;
  /** Clase del contenedor absoluto (posición sobre la imagen). */
  positionClassName?: string;
};

/**
 * Icono parpadeante sobre la imagen. Al tocarlo abre el mensaje en un popup.
 * - warning → advertencia (ámbar)
 * - info → información (azul suave)
 */
export function RecipeAdvisoryPulseButton({
  message,
  tone: toneProp,
  title,
  className,
  positionClassName
}: PulseButtonProps) {
  const t = useTranslations("Scanner");
  const [open, setOpen] = useState(false);
  const trimmed = message.trim();
  if (!trimmed) return null;

  const tone = toneProp ?? inferAdvisoryTone(trimmed);
  const isWarning = tone === "warning";

  const ariaLabel = isWarning
    ? t.has("advisoryAlertAria")
      ? t("advisoryAlertAria")
      : "Ver advertencia nutricional"
    : t.has("advisoryInfoAria")
      ? t("advisoryInfoAria")
      : "Ver información nutricional";

  const Icon = isWarning ? AlertTriangle : Info;

  return (
    <>
      <div
        className={cn(
          "pointer-events-auto absolute right-3 top-3 z-20",
          positionClassName
        )}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
          aria-label={ariaLabel}
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full shadow-md backdrop-blur-sm",
            "transition focus-visible:outline-none focus-visible:ring-2",
            isWarning
              ? "bg-yellow-300/70 text-[#8B6914] shadow-yellow-900/20 ring-1 ring-[#8B6914]/85 hover:bg-yellow-300/85 focus-visible:ring-[#A67C00]/50"
              : "bg-sky-300/70 text-sky-900 shadow-sky-900/15 ring-1 ring-sky-700/70 hover:bg-sky-300/85 focus-visible:ring-sky-500/50",
            className
          )}
        >
          <span
            className={cn(
              "absolute inset-0 animate-ping rounded-full",
              isWarning ? "bg-yellow-200/50" : "bg-sky-200/55"
            )}
            aria-hidden
          />
          <Icon
            className={cn(
              "relative z-[1] h-5 w-5 animate-pulse",
              isWarning ? "text-[#7A5C10]" : "text-sky-800"
            )}
            strokeWidth={2.5}
            aria-hidden
          />
        </button>
      </div>

      <RecipeAdvisoryPopup
        open={open}
        onClose={() => setOpen(false)}
        message={trimmed}
        tone={tone}
        title={title}
      />
    </>
  );
}

type PopupProps = {
  open: boolean;
  onClose: () => void;
  message: string;
  tone?: AdvisoryTone;
  title?: string;
};

export function RecipeAdvisoryPopup({
  open,
  onClose,
  message,
  tone: toneProp,
  title
}: PopupProps) {
  const t = useTranslations("Scanner");
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const tone = toneProp ?? inferAdvisoryTone(message);
  const isWarning = tone === "warning";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const heading =
    title ??
    (isWarning
      ? t.has("advisoryPopupTitle")
        ? t("advisoryPopupTitle")
        : "Advertencia"
      : t.has("advisoryPopupInfoTitle")
        ? t("advisoryPopupInfoTitle")
        : "Información");

  const Icon = isWarning ? AlertTriangle : Info;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl",
          isWarning ? "border border-amber-200/80" : "border border-sky-200/80"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={cn(
            "flex items-start gap-3 border-b px-4 py-3",
            isWarning
              ? "border-amber-100 bg-amber-50"
              : "border-sky-100 bg-sky-50"
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white",
              isWarning ? "bg-amber-500" : "bg-sky-500"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <h2
              id={titleId}
              className={cn(
                "text-sm font-bold",
                isWarning ? "text-amber-950" : "text-sky-950"
              )}
            >
              {heading}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-full p-1.5 transition",
              isWarning
                ? "text-amber-900/50 hover:bg-amber-100 hover:text-amber-950"
                : "text-sky-900/50 hover:bg-sky-100 hover:text-sky-950"
            )}
            aria-label={t.has("close") ? t("close") : "Cerrar"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 py-3.5">
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-stone-700">
            {message}
          </p>
        </div>
        <div className="border-t border-stone-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#3E5A3A] py-2.5 text-sm font-semibold text-white transition hover:bg-[#334a30]"
          >
            {t.has("advisoryPopupGotIt") ? t("advisoryPopupGotIt") : "Entendido"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Une varias recomendaciones en un solo mensaje para el popup. */
export function joinAdvisoryMessages(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Mensaje + tono para snack / comida fuera según el balance.
 * - mejorable → información
 * - poco_saludable → advertencia (tono UI; copy siempre empático)
 * - equilibrado → null (sin icono)
 */
export function buildUnhealthyBalanceAdvisory(input: {
  balance: "equilibrado" | "mejorable" | "poco_saludable" | string | null | undefined;
  tips?: string[] | null;
  fairLabel?: string;
  poorLabel?: string;
}): BalanceAdvisory | null {
  const balance = input.balance ?? "equilibrado";
  if (balance === "equilibrado") return null;

  const tips = (input.tips ?? [])
    .map((tip) => tip.trim())
    .filter((tip) => tip.length > 0);

  const isPoor = balance === "poco_saludable";
  const title = isPoor
    ? input.poorLabel?.trim() || "¡A disfrutarlo!"
    : input.fairLabel?.trim() || "¡Gran combinación de sabores!";

  // Cuerpo = tips; el título va aparte (no duplicar en el mensaje).
  const message = joinAdvisoryMessages(tips.length > 0 ? tips : [title]);
  if (!message) return null;

  return {
    title,
    message,
    tone: isPoor ? "warning" : "info"
  };
}
