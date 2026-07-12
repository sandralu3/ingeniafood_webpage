"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APP_VERSION_STORAGE_KEY } from "@/lib/app-version";

const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

type UseAppUpdateResult = {
  updateAvailable: boolean;
  isUpdating: boolean;
  applyUpdate: () => void;
  dismissUpdate: () => void;
};

async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const response = await fetch(`/api/app-version?t=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { version?: string };
    return data.version?.trim() ?? null;
  } catch {
    return null;
  }
}

export function useAppUpdate(): UseAppUpdateResult {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const shouldReloadOnControllerChangeRef = useRef(false);

  const markUpdateAvailable = useCallback((version?: string | null, worker?: ServiceWorker | null) => {
    if (version) {
      setRemoteVersion(version);
    }

    if (worker) {
      waitingWorkerRef.current = worker;
    }

    setUpdateAvailable(true);
  }, []);

  const checkRemoteVersion = useCallback(async () => {
    const version = await fetchRemoteVersion();
    if (!version) return;

    const storedVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);

    if (!storedVersion) {
      localStorage.setItem(APP_VERSION_STORAGE_KEY, version);
      return;
    }

    if (storedVersion !== version) {
      markUpdateAvailable(version);
    }
  }, [markUpdateAvailable]);

  useEffect(() => {
    void checkRemoteVersion();

    const onFocus = () => void checkRemoteVersion();
    window.addEventListener("focus", onFocus);

    const interval = window.setInterval(() => void checkRemoteVersion(), VERSION_CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [checkRemoteVersion]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });
      return;
    }

    let isMounted = true;

    const attachWaitingWorker = (registration: ServiceWorkerRegistration) => {
      const waitingWorker = registration.waiting;
      if (!waitingWorker || !navigator.serviceWorker.controller) return;

      if (!isMounted) return;

      void fetchRemoteVersion().then((version) => {
        if (!isMounted) return;
        markUpdateAvailable(version, waitingWorker);
      });
    };

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        if (registration.waiting) {
          attachWaitingWorker(registration);
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              attachWaitingWorker(registration);
            }
          });
        });
      } catch (error) {
        console.warn("[app-update] No se pudo registrar el service worker:", error);
      }
    };

    void registerServiceWorker();

    const onControllerChange = () => {
      if (!shouldReloadOnControllerChangeRef.current) return;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [markUpdateAvailable]);

  const applyUpdate = useCallback(() => {
    setIsUpdating(true);
    shouldReloadOnControllerChangeRef.current = true;

    if (remoteVersion) {
      localStorage.setItem(APP_VERSION_STORAGE_KEY, remoteVersion);
    }

    const waitingWorker = waitingWorkerRef.current;

    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    window.location.reload();
  }, [remoteVersion]);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return {
    updateAvailable,
    isUpdating,
    applyUpdate,
    dismissUpdate
  };
}
