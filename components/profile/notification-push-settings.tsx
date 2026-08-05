"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import { isPushSupported } from "@/lib/notifications/client-push";
import {
  disablePushOnThisDevice,
  enablePushOnThisDevice
} from "@/lib/notifications/push-client-actions";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function NotificationPushSettings({ className }: Props) {
  const t = useTranslations("Profile");
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setSupported(isPushSupported());

      try {
        const supabase = createSupabaseClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        setIsAdmin(isSandraAdmin(user?.email));
      } catch {
        setIsAdmin(false);
      }

      const response = await fetch("/api/notifications/push/preferences", {
        cache: "no-store"
      });
      if (!response.ok) {
        setConfigured(false);
        setEnabled(false);
        return;
      }
      const data = (await response.json()) as {
        configured?: boolean;
        enabled?: boolean;
      };
      setConfigured(Boolean(data.configured));
      setEnabled(Boolean(data.enabled));
    } catch {
      setError(
        t.has("pushLoadError")
          ? t("pushLoadError")
          : "No pudimos cargar el estado de las notificaciones."
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const enablePush = async () => {
    setIsSaving(true);
    setError(null);
    setTestMessage(null);
    try {
      await enablePushOnThisDevice();
      setEnabled(true);
      window.dispatchEvent(new Event("ingeniafood:push-changed"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.has("pushEnableError")
            ? t("pushEnableError")
            : "No pudimos activar las notificaciones."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const disablePush = async () => {
    setIsSaving(true);
    setError(null);
    setTestMessage(null);
    try {
      await disablePushOnThisDevice();
      setEnabled(false);
      window.dispatchEvent(new Event("ingeniafood:push-changed"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.has("pushDisableError")
            ? t("pushDisableError")
            : "No pudimos desactivar las notificaciones."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestPush = async () => {
    setIsTesting(true);
    setError(null);
    setTestMessage(null);
    try {
      const response = await fetch("/api/notifications/push/test", { method: "POST" });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        sent?: number;
      };

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            (t.has("pushTestError")
              ? t("pushTestError")
              : "No pudimos enviar la notificación de prueba.")
        );
      }

      setTestMessage(
        data.message ||
          (t.has("pushTestSuccess")
            ? t("pushTestSuccess")
            : "Notificación de prueba enviada.")
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.has("pushTestError")
            ? t("pushTestError")
            : "No pudimos enviar la notificación de prueba."
      );
    } finally {
      setIsTesting(false);
    }
  };

  const title = t.has("pushTitle") ? t("pushTitle") : "Notificaciones del móvil";
  const subtitle = t.has("pushSubtitle")
    ? t("pushSubtitle")
    : "Recibe avisos en la bandeja del sistema aunque la app esté cerrada.";
  const onLabel = t.has("pushEnabled") ? t("pushEnabled") : "Activadas";
  const offLabel = t.has("pushDisabled") ? t("pushDisabled") : "Desactivadas";
  const enableCta = t.has("pushEnableCta") ? t("pushEnableCta") : "Activar notificaciones";
  const disableCta = t.has("pushDisableCta") ? t("pushDisableCta") : "Desactivar";
  const unsupported = t.has("pushUnsupported")
    ? t("pushUnsupported")
    : "Este dispositivo o navegador no admite notificaciones push. Prueba la PWA instalada.";
  const notConfigured = t.has("pushNotConfigured")
    ? t("pushNotConfigured")
    : "Las notificaciones push no están configuradas en el servidor.";
  const testCta = t.has("pushTestCta") ? t("pushTestCta") : "Probar notificación (admin)";

  return (
    <section
      className={cn(
        "space-y-3 rounded-2xl border border-stone-100 bg-white/90 p-3 shadow-sm",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            enabled ? "bg-[#556B2F]/15 text-[#556B2F]" : "bg-stone-100 text-stone-500"
          )}
        >
          {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">{subtitle}</p>
          {isLoading ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-stone-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              …
            </p>
          ) : (
            <p
              className={cn(
                "mt-2 text-[11px] font-semibold",
                enabled ? "text-[#556B2F]" : "text-stone-500"
              )}
            >
              {enabled ? onLabel : offLabel}
            </p>
          )}
        </div>
      </div>

      {!isLoading && !supported ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-900">{unsupported}</p>
      ) : null}

      {!isLoading && supported && !configured ? (
        <p className="rounded-xl bg-stone-50 px-3 py-2 text-[11px] text-stone-600">{notConfigured}</p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
          {error}
        </p>
      ) : null}

      {testMessage ? (
        <p role="status" className="rounded-xl bg-[#F0F4ED] px-3 py-2 text-[11px] text-[#3e5219]">
          {testMessage}
        </p>
      ) : null}

      {!isLoading && supported && configured ? (
        <button
          type="button"
          disabled={isSaving || isTesting}
          onClick={() => void (enabled ? disablePush() : enablePush())}
          className={cn(
            "inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[12px] font-semibold transition disabled:opacity-60",
            enabled
              ? "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              : "bg-[#4c6633] text-white shadow-md shadow-[#4c6633]/15 hover:bg-[#556B2F]"
          )}
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {enabled ? disableCta : enableCta}
        </button>
      ) : null}

      {!isLoading && isAdmin ? (
        <button
          type="button"
          disabled={isTesting || isSaving}
          onClick={() => void sendTestPush()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#4C6B3F]/25 bg-[#F0F4ED] px-4 py-2.5 text-[12px] font-semibold text-[#3e5219] transition hover:bg-[#E5EEDF] disabled:opacity-60"
        >
          {isTesting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" strokeWidth={2} />
          )}
          {testCta}
        </button>
      ) : null}
    </section>
  );
}
