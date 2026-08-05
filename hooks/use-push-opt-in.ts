"use client";

import { useCallback, useEffect, useState } from "react";
import { isPushSupported } from "@/lib/notifications/client-push";
import { enablePushOnThisDevice } from "@/lib/notifications/push-client-actions";
import {
  dismissPushOptIn,
  isPushOptInDismissed
} from "@/lib/notifications/push-opt-in-dismiss";

export type PushPermission = NotificationPermission | "unsupported";

const PUSH_CHANGED_EVENT = "ingeniafood:push-changed";

type State = {
  isLoading: boolean;
  supported: boolean;
  configured: boolean;
  enabled: boolean;
  permission: PushPermission;
  isEnabling: boolean;
  error: string | null;
  hoyDismissed: boolean;
};

const INITIAL: State = {
  isLoading: true,
  supported: false,
  configured: false,
  enabled: false,
  permission: "unsupported",
  isEnabling: false,
  error: null,
  hoyDismissed: false
};

function readPermission(): PushPermission {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

function notifyPushChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PUSH_CHANGED_EVENT));
}

/**
 * Estado de push + activación para soft prompts (Hoy / campana) y ajustes.
 */
export function usePushOptIn() {
  const [state, setState] = useState<State>(INITIAL);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    }
    try {
      const supported = isPushSupported();
      const permission = readPermission();
      const hoyDismissed = isPushOptInDismissed();

      if (!supported) {
        setState({
          ...INITIAL,
          isLoading: false,
          supported: false,
          permission: "unsupported",
          hoyDismissed
        });
        return;
      }

      const response = await fetch("/api/notifications/push/preferences", {
        cache: "no-store"
      });
      if (!response.ok) {
        setState({
          isLoading: false,
          supported: true,
          configured: false,
          enabled: false,
          permission,
          isEnabling: false,
          error: null,
          hoyDismissed
        });
        return;
      }

      const data = (await response.json()) as {
        configured?: boolean;
        enabled?: boolean;
      };

      setState((prev) => ({
        isLoading: false,
        supported: true,
        configured: Boolean(data.configured),
        enabled: Boolean(data.enabled),
        permission,
        isEnabling: false,
        error: opts?.silent ? prev.error : null,
        hoyDismissed
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "No pudimos cargar el estado de las notificaciones."
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => {
      void refresh({ silent: true });
    };
    window.addEventListener(PUSH_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(PUSH_CHANGED_EVENT, onChanged);
  }, [refresh]);

  const needsOptIn =
    !state.isLoading &&
    state.supported &&
    state.configured &&
    !state.enabled;

  /** CTA en la campana: siempre que falte activar. */
  const shouldShowBellCta = needsOptIn;

  /** Banner en Hoy: además respeta “Ahora no”. */
  const shouldShowHoyBanner = needsOptIn && !state.hoyDismissed;

  const enable = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isEnabling: true, error: null }));
    try {
      await enablePushOnThisDevice();
      setState((prev) => ({
        ...prev,
        isEnabling: false,
        enabled: true,
        permission: "granted",
        error: null
      }));
      notifyPushChanged();
      return true;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isEnabling: false,
        permission: readPermission(),
        error:
          err instanceof Error
            ? err.message
            : "No pudimos activar las notificaciones."
      }));
      return false;
    }
  }, []);

  const dismissHoyBanner = useCallback(() => {
    dismissPushOptIn();
    setState((prev) => ({ ...prev, hoyDismissed: true }));
  }, []);

  return {
    ...state,
    needsOptIn,
    shouldShowBellCta,
    shouldShowHoyBanner,
    enable,
    dismissHoyBanner,
    refresh
  };
}
