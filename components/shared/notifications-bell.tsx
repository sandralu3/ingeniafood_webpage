"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Trash2,
  UserPlus,
  BookOpen,
  X
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
  deleteLabel,
  onActivate,
  onDelete
}: {
  item: UserNotification;
  deleteLabel: string;
  onActivate: (item: UserNotification) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = notificationIcon(item.type);
  const unread = !item.read_at;

  const content = (
    <div
      className={cn(
        "relative flex gap-3 px-3 py-3 transition-colors",
        "hover:bg-stone-50 active:bg-stone-100",
        unread ? "bg-emerald-50/60" : "bg-white opacity-80"
      )}
    >
      {unread ? (
        <span
          className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#556B2F]"
          aria-hidden
        />
      ) : null}
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          unread ? "bg-[#556B2F]/15 text-[#556B2F]" : "bg-stone-100 text-stone-400"
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.85} />
      </span>
      <div className="min-w-0 flex-1 pl-1 pr-8">
        <p
          className={cn(
            "text-[13px] leading-snug",
            unread ? "font-bold text-stone-900" : "font-medium text-stone-500"
          )}
        >
          {item.title}
        </p>
        <p
          className={cn(
            "mt-0.5 line-clamp-3 text-[11px] leading-relaxed",
            unread ? "text-stone-600" : "text-stone-400"
          )}
        >
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
      <div className="relative border-b border-stone-100 last:border-0">
        <Link
          href={item.href}
          onClick={(event) => {
            event.preventDefault();
            onActivate(item);
          }}
          className="block cursor-pointer"
        >
          {content}
        </Link>
        <button
          type="button"
          aria-label={deleteLabel}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(item.id);
          }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-stone-300 transition hover:bg-rose-50 hover:text-rose-500"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative border-b border-stone-100 last:border-0">
      <button
        type="button"
        className="block w-full cursor-pointer text-left"
        onClick={() => onActivate(item)}
      >
        {content}
      </button>
      <button
        type="button"
        aria-label={deleteLabel}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDelete(item.id);
        }}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-stone-300 transition hover:bg-rose-50 hover:text-rose-500"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />
      </button>
    </div>
  );
}

export function NotificationsBell() {
  const t = useTranslations("Notifications");
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    isLoading,
    isOpen,
    setIsOpen,
    sync,
    markRead,
    markAllRead,
    deleteOne,
    deleteAll
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, setIsOpen]);

  const title = t.has("title") ? t("title") : "Notificaciones";
  const empty = t.has("empty") ? t("empty") : "No tienes notificaciones todavía.";
  const markAll = t.has("markAllReadShort")
    ? t("markAllReadShort")
    : t.has("markAllRead")
      ? t("markAllRead")
      : "Marcar leídas";
  const deleteOneLabel = t.has("deleteOne") ? t("deleteOne") : "Eliminar notificación";
  const deleteAllLabel = t.has("deleteAll") ? t("deleteAll") : "Eliminar todas";
  const closeLabel = t.has("close") ? t("close") : "Cerrar";
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

  const handleActivate = (item: UserNotification) => {
    if (!item.read_at) {
      void markRead(item.id);
    }
    setIsOpen(false);
    if (item.href?.trim()) {
      router.push(item.href);
    }
  };

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
        <div
          className={cn(
            "z-[80] overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-2xl shadow-stone-300/50",
            // Móvil: anclado al viewport con márgenes seguros (no se corta a la izquierda)
            "fixed left-4 right-4 top-[calc(env(safe-area-inset-top,0px)+3.25rem)] max-h-[min(28rem,70vh)]",
            // Desktop / sm+: anclado a la campana, alineado a la derecha
            "sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 sm:max-w-[min(24rem,calc(100vw-2rem))]"
          )}
          role="dialog"
          aria-label={title}
        >
          <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900">{title}</p>
              {isLoading ? (
                <p className="text-[10px] text-stone-400">{loadingLabel}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {notifications.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void deleteAll()}
                  className="text-xs font-medium text-stone-500 transition hover:text-rose-600 hover:underline"
                >
                  {deleteAllLabel}
                </button>
              ) : null}
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-xs font-medium text-[#556B2F] transition hover:underline"
                >
                  {markAll}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                aria-label={closeLabel}
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="max-h-[min(22rem,55vh)] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-stone-500">{empty}</p>
            ) : (
              notifications.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  deleteLabel={deleteOneLabel}
                  onActivate={handleActivate}
                  onDelete={(id) => void deleteOne(id)}
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
