"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  Bell,
  CalendarDays,
  Droplets,
  Flame,
  Gift,
  Instagram,
  Loader2,
  RefreshCw,
  Sparkles,
  UserPlus,
  BookOpen
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useNotifications } from "@/hooks/use-notifications";
import { useAppUpdate } from "@/hooks/use-app-update";
import { usePushOptIn } from "@/hooks/use-push-opt-in";
import type { NotificationType, UserNotification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

function notificationIcon(type: NotificationType) {
  switch (type) {
    case "streak_at_risk":
      return Flame;
    case "reengagement":
      return Sparkles;
    case "sandra_tip":
      return BookOpen;
    case "empty_meal_slot":
      return CalendarDays;
    case "water_midday":
      return Droplets;
    case "instagram_catalog":
      return Instagram;
    case "promo_claimable":
      return Gift;
    case "app_update":
      return RefreshCw;
    case "admin_new_user":
      return UserPlus;
    case "admin_catalog_published":
      return Instagram;
    default:
      return Bell;
  }
}

function formatRelativeTime(iso: string): string {
  const created = new Date(iso).getTime();
  const diffMin = Math.max(0, Math.round((Date.now() - created) / 60000));
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `Hace ${diffD} d`;
}

function NotificationRow({
  item,
  onRead
}: {
  item: UserNotification;
  onRead: (id: string) => void;
}) {
  const Icon = notificationIcon(item.type);
  const unread = !item.read_at;
  const content = (
    <div
      className={cn(
        "flex gap-3 rounded-xl px-3 py-2.5 transition",
        unread ? "bg-amber-50/80" : "hover:bg-stone-50"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          unread ? "bg-[#556B2F]/15 text-[#556B2F]" : "bg-stone-100 text-stone-500"
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.85} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold leading-snug text-stone-900">{item.title}</p>
          {unread ? (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#556B2F]" aria-hidden />
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-3 text-[11px] leading-relaxed text-stone-600">
          {item.body}
        </p>
        <p className="mt-1 text-[10px] font-medium text-stone-400">
          {formatRelativeTime(item.created_at)}
        </p>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        onClick={() => {
          if (unread) onRead(item.id);
        }}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="w-full text-left"
      onClick={() => {
        if (unread) onRead(item.id);
      }}
    >
      {content}
    </button>
  );
}

export function NotificationsBell() {
  const t = useTranslations("Notifications");
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    isLoading,
    isOpen,
    setIsOpen,
    sync,
    markRead,
    markAllRead
  } = useNotifications();
  const { updateAvailable } = useAppUpdate();
  const {
    shouldShowBellCta,
    permission,
    isEnabling,
    error: pushError,
    enable: enablePush
  } = usePushOptIn();

  useEffect(() => {
    if (!updateAvailable) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/app-version?t=${Date.now()}`, {
          cache: "no-store"
        });
        const data = (await response.json()) as { version?: string };
        if (cancelled) return;
        await sync({ updateVersion: data.version?.trim() || "available" });
      } catch {
        if (!cancelled) await sync({ updateVersion: "available" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sync, updateAvailable]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isOpen, setIsOpen]);

  const title = t.has("title") ? t("title") : "Notificaciones";
  const empty = t.has("empty") ? t("empty") : "No tienes notificaciones todavía.";
  const markAll = t.has("markAllRead") ? t("markAllRead") : "Marcar todas como leídas";
  const loadingLabel = t.has("loading") ? t("loading") : "Actualizando…";
  const pushBlocked = permission === "denied";
  const pushCtaTitle = t.has("pushOptInTitle")
    ? t("pushOptInTitle")
    : "Recibe esto también en el móvil";
  const pushCtaBody = pushBlocked
    ? t.has("pushOptInBlocked")
      ? t("pushOptInBlocked")
      : "Están bloqueadas en el navegador. Actívalas en los ajustes del sistema."
    : t.has("pushOptInBody")
      ? t("pushOptInBody")
      : "Activa avisos para tu progreso y novedades.";
  const pushEnableCta = t.has("pushOptInEnable")
    ? t("pushOptInEnable")
    : "Activar notificaciones";

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
        aria-label={title}
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#556B2F] px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-[80] mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-2xl shadow-stone-300/40">
          <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-stone-900">{title}</p>
              {isLoading ? (
                <p className="text-[10px] text-stone-400">{loadingLabel}</p>
              ) : null}
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[10px] font-semibold text-[#556B2F] transition hover:underline"
              >
                {markAll}
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(24rem,60vh)] space-y-0.5 overflow-y-auto p-1.5">
            {notifications.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-stone-500">{empty}</p>
            ) : (
              notifications.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onRead={(id) => {
                    void markRead(id);
                  }}
                />
              ))
            )}
          </div>

          {shouldShowBellCta ? (
            <div className="border-t border-stone-100 bg-[#F7F9F4] px-3 py-2.5">
              <p className="text-[12px] font-semibold leading-snug text-stone-900">
                {pushCtaTitle}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-stone-600">{pushCtaBody}</p>
              {!pushBlocked ? (
                <button
                  type="button"
                  disabled={isEnabling}
                  onClick={() => void enablePush()}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#4c6633] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#556B2F] disabled:opacity-60"
                >
                  {isEnabling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  {pushEnableCta}
                </button>
              ) : null}
              {pushError ? (
                <p className="mt-1.5 text-[10px] text-rose-600" role="alert">
                  {pushError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
