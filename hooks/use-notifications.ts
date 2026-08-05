"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import type { UserNotification } from "@/lib/notifications/types";
import type { AppLocale } from "@/i18n/config";

type NotificationsState = {
  notifications: UserNotification[];
  unreadCount: number;
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
  sync: (options?: { updateVersion?: string | null }) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

export function useNotifications(): NotificationsState {
  const locale = useLocale() as AppLocale;
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const applyPayload = useCallback(
    (data: { notifications?: UserNotification[]; unreadCount?: number }) => {
      if (Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
      if (typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as {
        notifications?: UserNotification[];
        unreadCount?: number;
      };
      applyPayload(data);
    } catch {
      // silencioso: la campana no debe romper la app
    }
  }, [applyPayload]);

  const sync = useCallback(
    async (options?: { updateVersion?: string | null }) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/notifications/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            localHour: new Date().getHours(),
            locale,
            updateVersion: options?.updateVersion ?? null
          })
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          notifications?: UserNotification[];
          unreadCount?: number;
        };
        applyPayload(data);
      } catch {
        // silencioso
      } finally {
        setIsLoading(false);
      }
    },
    [applyPayload, locale]
  );

  const markRead = useCallback(async (id: string) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
    } catch {
      void refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString()
      }))
    );
    setUnreadCount(0);

    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true })
      });
    } catch {
      void refresh();
    }
  }, [refresh]);

  useEffect(() => {
    void sync();
    const intervalId = window.setInterval(() => {
      void sync();
    }, 15 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [sync]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isOpen,
    setIsOpen,
    refresh,
    sync,
    markRead,
    markAllRead
  };
}
