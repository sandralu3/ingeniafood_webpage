"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download } from "lucide-react";
import AuthPage from "@/app/auth/page";
import { resolveSupabaseAuthLandingUrl } from "@/lib/auth/resolve-supabase-auth-landing";
import { IngeniaFoodLogo } from "@/components/shared/ingenia-food-logo";
import {
  prefetchHoyPageData,
  refreshHoyPageDataInBackground
} from "@/lib/gamification/prefetch-hoy-page-data";
import { prefetchInstagramCatalog } from "@/lib/recipes/prefetch-instagram-catalog";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { createSupabaseClient } from "@/lib/supabaseClient";
import {
  clearStashedReferralCode,
  readStashedReferralCode
} from "@/lib/referral/referral";
import { Header } from "@/components/shared/header";
import { BottomNav } from "@/components/shared/bottom-nav";

type AuthState = "loading" | "authenticated" | "unauthenticated";
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function detectStandaloneMode() {
  if (typeof window === "undefined") return false;
  const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as { standalone?: boolean }).standalone);
  return mediaStandalone || iosStandalone;
}

function canUseWebAccessInCurrentHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
}

function InstallationLanding({
  onInstallClick,
  showIosModal,
  setShowIosModal,
  installButtonDisabled
}: {
  onInstallClick: () => Promise<void>;
  showIosModal: boolean;
  setShowIosModal: (value: boolean) => void;
  installButtonDisabled: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#FDFCFB] px-6 py-10 text-center text-[#1b1c19]">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col items-center justify-center">
        <IngeniaFoodLogo variant="auth" />
        <h1 className="mt-5 text-3xl font-bold leading-tight text-[#556B2F]">
          Paso 1: Instala IngeniaFood en tu inicio para comenzar
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          Estás a un paso de tu ingeniero culinario personal. Instala la app para desbloquear el
          escáner de IA.
        </p>
        <button
          type="button"
          onClick={() => void onInstallClick()}
          disabled={installButtonDisabled}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#556B2F] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Instalar App Ahora
        </button>
        {installButtonDisabled ? (
          <p className="mt-3 text-xs text-stone-600">
            Si no aparece la ventana automática, abre el menú <strong>⋮</strong> de Chrome y toca{" "}
            <strong>&quot;Instalar aplicación&quot;</strong>.
          </p>
        ) : null}

        <div className="mt-7 grid w-full gap-3 text-left">
          <div className="rounded-2xl border border-[#556B2F]/20 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-[#556B2F]">Android (Chrome)</p>
            <p className="mt-1 text-sm text-stone-700">
              Toca <strong>⋮</strong> y elige <strong>&quot;Instalar aplicación&quot;</strong>.
            </p>
          </div>
          <div className="rounded-2xl border border-[#556B2F]/20 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-[#556B2F]">iOS (Safari)</p>
            <p className="mt-1 text-sm text-stone-700">
              Toca <strong>Compartir</strong> y luego{" "}
              <strong>&quot;Añadir a pantalla de inicio&quot;</strong>.
            </p>
          </div>
        </div>
      </div>
      {showIosModal ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-left shadow-lg">
            <p className="text-base font-semibold text-[#556B2F]">Instalar en iPhone</p>
            <p className="mt-2 text-sm text-stone-700">
              Toca el icono de compartir y luego{" "}
              <strong>&quot;Añadir a la pantalla de inicio&quot;</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="mt-4 rounded-full bg-[#556B2F] px-4 py-2 text-sm font-semibold text-white"
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AppRecetasAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isScannerRoute =
    pathname === APP_ROUTES.scanner || pathname.startsWith(`${APP_ROUTES.scanner}/`);
  const [isStandalone, setIsStandalone] = useState(false);
  const [checkedStandalone, setCheckedStandalone] = useState(false);
  const [allowWebAccess, setAllowWebAccess] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [pendingAuthRedirect, setPendingAuthRedirect] = useState(true);

  useEffect(() => {
    const target = resolveSupabaseAuthLandingUrl({
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      origin: window.location.origin
    });

    if (target && target !== window.location.href) {
      window.location.replace(target);
      return;
    }

    setPendingAuthRedirect(false);
  }, []);

  useEffect(() => {
    setAllowWebAccess(canUseWebAccessInCurrentHost());
    const updateStandalone = () => {
      setIsStandalone(detectStandaloneMode());
      setCheckedStandalone(true);
    };
    updateStandalone();
    window.addEventListener("appinstalled", updateStandalone);
    window.addEventListener("focus", updateStandalone);
    return () => {
      window.removeEventListener("appinstalled", updateStandalone);
      window.removeEventListener("focus", updateStandalone);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setShowIosModal(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!checkedStandalone) return;
    if (!isStandalone && !allowWebAccess) {
      setAuthState("unauthenticated");
      return;
    }

    const supabase = createSupabaseClient();
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setAuthenticatedUserId(data.session?.user.id ?? null);
      setAuthState(data.session ? "authenticated" : "unauthenticated");
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setAuthenticatedUserId(session?.user.id ?? null);
      setAuthState(session ? "authenticated" : "unauthenticated");
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [allowWebAccess, checkedStandalone, isStandalone]);

  useEffect(() => {
    if (authState !== "authenticated" || !authenticatedUserId) return;

    void prefetchHoyPageData({ userId: authenticatedUserId });
    void prefetchInstagramCatalog();

    const referralCode = readStashedReferralCode();
    if (!referralCode) return;
    // Referral stash cleared without credit awards (subscription model).
    clearStashedReferralCode();
  }, [authState, authenticatedUserId]);

  useEffect(() => {
    if (authState !== "authenticated" || !authenticatedUserId) return;

    const onFocus = () => {
      void refreshHoyPageDataInBackground(authenticatedUserId);
      void prefetchInstagramCatalog({ background: true });
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [authState, authenticatedUserId]);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (pendingAuthRedirect || !checkedStandalone) {
    return (
      <div
        className="min-h-screen bg-[#FDFCFB]"
        aria-busy="true"
        suppressHydrationWarning
      />
    );
  }

  if (!isStandalone && !allowWebAccess) {
    return (
      <InstallationLanding
        onInstallClick={handleInstallClick}
        showIosModal={showIosModal}
        setShowIosModal={setShowIosModal}
        installButtonDisabled={!isIos && !deferredPrompt}
      />
    );
  }

  if (authState === "loading") {
    return (
      <div
        className="min-h-screen bg-[#FDFCFB]"
        aria-busy="true"
        suppressHydrationWarning
      />
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#FDFCFB] px-4 py-6">
        <AuthPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sv-surface text-sv-on-surface">
      <div className="mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col overflow-hidden pb-[var(--app-bottom-nav-height)]">
        <Header />
        <main
          key={pathname}
          className={
            isScannerRoute
              ? "flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3 pb-2"
              : "flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-3 pb-2"
          }
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
