"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AuthPage from "@/app/auth/page";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Header } from "@/components/shared/header";
import { BottomNav } from "@/components/shared/bottom-nav";

type AuthState = "loading" | "authenticated" | "unauthenticated";

function detectStandaloneMode() {
  if (typeof window === "undefined") return false;
  const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as { standalone?: boolean }).standalone);
  return mediaStandalone || iosStandalone;
}

function InstallationLanding() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] px-6 py-10 text-center text-[#1b1c19]">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col items-center justify-center">
        <p className="text-base tracking-[0.06em] text-stone-700">
          <span className="font-medium">Sandra Vergara</span>
          <span className="mx-1 text-stone-400">|</span>
          <span className="font-light text-[#444444]">Ingenia</span>
          <span className="font-bold text-[#556B2F]">Food</span>
        </p>
        <h1 className="mt-5 text-3xl font-bold leading-tight text-[#556B2F]">
          Paso 1: Instala IngeniaFood en tu inicio para comenzar
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          Estás a un paso de tu ingeniero culinario personal. Instala la app para desbloquear el
          escáner de IA.
        </p>

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
    </div>
  );
}

export function AppRecetasAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isStandalone, setIsStandalone] = useState(false);
  const [checkedStandalone, setCheckedStandalone] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
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
    if (!checkedStandalone) return;
    if (!isStandalone) {
      setAuthState("unauthenticated");
      return;
    }

    const supabase = createSupabaseClient();
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setAuthState(data.session ? "authenticated" : "unauthenticated");
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setAuthState(session ? "authenticated" : "unauthenticated");
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [checkedStandalone, isStandalone]);

  useEffect(() => {
    if (authState === "authenticated" && pathname === "/app-recetas") {
      router.replace("/app-recetas/scanner");
    }
  }, [authState, pathname, router]);

  const content = useMemo(() => {
    if (!checkedStandalone) {
      return <div className="min-h-screen bg-[#FDFCFB]" />;
    }

    if (!isStandalone) {
      return <InstallationLanding />;
    }

    if (authState === "loading") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FDFCFB]">
          <p className="text-sm text-stone-600">Preparando tu experiencia IngeniaFood...</p>
        </div>
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
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-20">
          <Header />
          <main className="flex-1 px-4 py-6">{children}</main>
        </div>
        <BottomNav />
      </div>
    );
  }, [authState, checkedStandalone, children, isStandalone]);

  return content;
}
