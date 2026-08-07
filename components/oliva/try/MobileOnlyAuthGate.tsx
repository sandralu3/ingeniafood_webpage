"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  APP_PATH,
  TRY_PATH,
  isDesktopAuthException,
  isLocalDevHost
} from "@/lib/mobile-only-access";
import { shouldEnforceMobileQr } from "@/components/oliva/try/device";

function detectStandaloneMode() {
  if (typeof window === "undefined") return false;
  const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as { standalone?: boolean }).standalone);
  return mediaStandalone || iosStandalone;
}

/**
 * Client-side belt-and-suspenders for /login and /auth.
 * - Desktop (tunnel/prod): QR via /app
 * - Mobile browser: force install gate (/app-recetas) before auth
 * - Installed PWA / localhost: allow auth UI
 */
export function MobileOnlyAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/login";
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (isDesktopAuthException(pathname, params)) {
      setAllowed(true);
      return;
    }

    if (shouldEnforceMobileQr()) {
      router.replace(TRY_PATH);
      return;
    }

    const host = window.location.hostname;
    if (isLocalDevHost(host) || detectStandaloneMode()) {
      setAllowed(true);
      return;
    }

    // Mobile browser (not installed): install first, then register/login in the PWA.
    router.replace(APP_PATH);
  }, [pathname, router, searchParams]);

  if (!allowed) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#fbf9f4]">
        <p className="text-sm text-[#86736d]">Preparando IngeniaFood…</p>
      </section>
    );
  }

  return children;
}
