"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, UtensilsCrossed } from "lucide-react";
import { RecipeCard } from "@/components/recipes/RecipeCard";

const popularRecipes = [
  {
    title: "Bowl Verde Anti Inflamatorio",
    category: "Popular",
    time: "18 min",
    description: "Receta ligera con vegetales frescos y grasas saludables para cuidar tu energia."
  },
  {
    title: "Pollo al Horno con Hierbas",
    category: "Sin Harinas",
    time: "28 min",
    description: "Proteina magra con especias naturales para una cena simple y balanceada."
  },
  {
    title: "Smoothie de Frutos Rojos",
    category: "Desayuno",
    time: "10 min",
    description: "Combinacion de antioxidantes y fibra para arrancar el dia de forma saludable."
  }
];

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type WindowWithDeferredPrompt = Window & {
  __ingeniaDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
};

function detectStandaloneMode() {
  if (typeof window === "undefined") return false;
  const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = "standalone" in window.navigator && Boolean((window.navigator as { standalone?: boolean }).standalone);
  return mediaStandalone || iosStandalone;
}

export default function AppRecetasHomePage() {
  const [isStandalone, setIsStandalone] = useState(() => detectStandaloneMode());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window === "undefined") return null;
    return (window as WindowWithDeferredPrompt).__ingeniaDeferredInstallPrompt ?? null;
  });
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isIos] = useState(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua);
  });

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const installPromptEvent = event as BeforeInstallPromptEvent;
      (window as WindowWithDeferredPrompt).__ingeniaDeferredInstallPrompt = installPromptEvent;
      setDeferredPrompt(installPromptEvent);
    };

    const onAppInstalled = () => {
      (window as WindowWithDeferredPrompt).__ingeniaDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const showInstallOverlay = useMemo(() => !isStandalone, [isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowInstallHelp(true);
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      (window as WindowWithDeferredPrompt).__ingeniaDeferredInstallPrompt = null;
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
  };

  return (
    <>
      {showInstallOverlay ? (
        <div className="fixed inset-0 z-[120] bg-[#FDFCFB] text-[#1b1c19]">
          <div className="mx-auto flex h-full w-full max-w-md flex-col items-center justify-center px-6 text-center">
            <p className="mb-3 text-sm tracking-[0.08em] text-stone-700">
              <span className="font-medium">Sandra Vergara</span>
              <span className="mx-1 text-stone-400">|</span>
              <span className="font-light text-[#444444]">Ingenia</span>
              <span className="font-bold text-[#556B2F]">Food</span>
            </p>
            <h1 className="text-2xl font-bold text-[#556B2F]">Instala IngeniaFood</h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-700">
              Para usar IngeniaFood, instálala en tu pantalla de inicio.
            </p>
            {isIos ? (
              <p className="mt-6 rounded-2xl border border-[#556B2F]/20 bg-white px-4 py-3 text-sm leading-relaxed text-stone-700">
                En Safari: toca el icono de compartir y luego{" "}
                <strong>&quot;Añadir a la pantalla de inicio&quot;</strong>.
              </p>
            ) : (
              <>
              <button
                type="button"
                onClick={() => void handleInstall()}
                className="mt-6 inline-flex rounded-full bg-[#556B2F] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#4a5d29]"
              >
                Instalar IngeniaFood
              </button>
                {showInstallHelp || !deferredPrompt ? (
                  <p className="mt-4 rounded-2xl border border-[#556B2F]/20 bg-white px-4 py-3 text-sm leading-relaxed text-stone-700">
                    Si no aparece el popup automático, abre el menú del navegador y selecciona{" "}
                    <strong>&quot;Instalar app&quot;</strong> o{" "}
                    <strong>&quot;Añadir a pantalla de inicio&quot;</strong>.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}

      <section className="space-y-8">
        <article className="relative overflow-hidden rounded-3xl border border-brand-green-light/25 bg-white px-5 py-6 shadow-sm">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-green-light/20" />
          <div className="relative space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green-light">
                Cocina Inteligente
              </p>
              <h1 className="text-3xl font-bold leading-tight text-brand-green-dark">
                Transforma tu nevera en bienestar diario.
              </h1>
              <p className="max-w-[32ch] text-sm leading-relaxed text-brand-green-dark/80">
                Descubre recetas personalizadas con lo que ya tienes en casa. Menos friccion, mas
                salud en cada comida.
              </p>
            </div>

            <Link
              href="/app-recetas/scanner"
              className="inline-flex items-center gap-2 rounded-full bg-brand-green-dark px-5 py-3 text-sm font-semibold text-brand-cream shadow-md shadow-brand-green-dark/25 transition hover:bg-brand-green-dark/90"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Seleccionar Ingredientes
            </Link>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-brand-green-light/25 bg-brand-cream px-3 py-2 text-xs text-brand-green-dark/85">
              <Sparkles className="h-4 w-4 text-brand-green-light" />
              Tip del dia: agrega hojas verdes en tu primera comida.
            </div>
          </div>
        </article>

        <article className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-green-dark">
                Recetas Populares
              </h2>
              <p className="text-sm text-brand-green-dark/70">Inspiradas en tu estilo saludable.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {popularRecipes.map((recipe, index) => (
              <RecipeCard
                key={recipe.title}
                title={recipe.title}
                category={recipe.category}
                time={recipe.time}
                description={recipe.description}
                imageLabel={`Imagen de ${recipe.title}`}
                featured={index === 0}
              />
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
