"use client";

import { Bell, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePushOptIn } from "@/hooks/use-push-opt-in";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Soft prompt en Hoy: invita a activar push si están desactivadas.
 * “Ahora no” oculta el aviso ~10 días.
 */
export function PushOptInBanner({ className }: Props) {
  const t = useTranslations("Hoy");
  const {
    isLoading,
    shouldShowHoyBanner,
    permission,
    isEnabling,
    error,
    enable,
    dismissHoyBanner
  } = usePushOptIn();

  if (isLoading || !shouldShowHoyBanner) return null;

  const blocked = permission === "denied";
  const title = t.has("pushOptInTitle")
    ? t("pushOptInTitle")
    : "No te pierdas tu progreso";
  const body = blocked
    ? t.has("pushOptInBlocked")
      ? t("pushOptInBlocked")
      : "Las notificaciones están bloqueadas en el navegador. Actívalas en los ajustes del sistema."
    : t.has("pushOptInBody")
      ? t("pushOptInBody")
      : "Activa avisos para seguir tu racha y enterarte de novedades.";
  const enableCta = t.has("pushOptInEnable")
    ? t("pushOptInEnable")
    : "Activar";
  const laterCta = t.has("pushOptInLater") ? t("pushOptInLater") : "Ahora no";
  const dismissAria = t.has("pushOptInDismissAria")
    ? t("pushOptInDismissAria")
    : "Cerrar aviso de notificaciones";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative flex items-start gap-2.5 rounded-[18px] border border-[#D5DFD0] bg-[#F0F4ED] px-3 py-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#556B2F]/15 text-[#556B2F]">
          <Bell className="h-4 w-4" strokeWidth={1.85} />
        </span>
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-[12px] font-bold leading-snug text-[#2F3D22]">{title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[#4A5C3A]">{body}</p>
          {!blocked ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isEnabling}
                onClick={() => void enable()}
                className="inline-flex items-center justify-center gap-1 rounded-full bg-gradient-to-br from-[#5C7A54] via-[#3E5A3A] to-[#2F452C] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-[#3E5A3A]/20 transition hover:brightness-110 disabled:opacity-60"
              >
                {isEnabling ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {enableCta}
              </button>
              <button
                type="button"
                disabled={isEnabling}
                onClick={dismissHoyBanner}
                className="text-[11px] font-semibold text-[#556B2F]/80 transition hover:text-[#3E5A3A] hover:underline disabled:opacity-60"
              >
                {laterCta}
              </button>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismissHoyBanner}
          className="absolute right-2 top-2 rounded-full p-1 text-[#556B2F]/70 transition hover:bg-[#556B2F]/10 hover:text-[#3E5A3A]"
          aria-label={dismissAria}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      {error ? (
        <p className="px-1 text-[10px] text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
