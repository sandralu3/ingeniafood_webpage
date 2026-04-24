"use client";

import { useEffect, useState } from "react";

function detectStandaloneMode() {
  if (typeof window === "undefined") return false;
  const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as { standalone?: boolean }).standalone);
  return mediaStandalone || iosStandalone;
}

function isMobileUserAgent() {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    window.navigator.userAgent
  );
}

export function AppModeOverlay() {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const refreshState = () => {
      const isStandalone = detectStandaloneMode();
      const isMobile = isMobileUserAgent();
      setShowOverlay(isMobile && !isStandalone);
    };

    refreshState();
    window.addEventListener("appinstalled", refreshState);
    window.addEventListener("focus", refreshState);
    return () => {
      window.removeEventListener("appinstalled", refreshState);
      window.removeEventListener("focus", refreshState);
    };
  }, []);

  if (!showOverlay) return null;

  return (
    <div className="fixed inset-0 z-[140] bg-[#FDFCFB] px-6 text-center text-[#1b1c19]">
      <div className="mx-auto flex h-full w-full max-w-md flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-[#556B2F]">Experiencia Optimizada</h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          Para usar el escáner de ingredientes, abre IngeniaFood desde tu pantalla de inicio.
        </p>
      </div>
    </div>
  );
}
