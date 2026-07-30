"use client";

import { Loader2, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { PremiumLabel, PremiumRichText } from "@/components/premium/premium-label";
import { usePremium } from "@/hooks/use-premium";
import { APP_ROUTES } from "@/lib/navigation/app-routes";

export default function TestPremiumPage() {
  const { userId, isPremium, isPaidPremium, isLoading, error } = usePremium();

  return (
    <main className="-mx-4 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-sv-surface px-4 pb-8 pt-2">
      <section className="mx-auto w-full max-w-md space-y-3">
        <header className="rounded-2xl bg-white/90 px-3 py-3 shadow-sm shadow-stone-100/30">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
            Test <PremiumLabel size="xs" />
          </p>
          <h1 className="mt-1 font-serif text-lg font-semibold text-stone-900">/test-premium</h1>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            <PremiumRichText text="Estado Premium de la cuenta. La prueba de 1 uso ya no está disponible." size="xs" />
          </p>
        </header>

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-3 text-xs text-stone-500 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]/60" />
            Cargando tu plan…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
            {error}
          </div>
        ) : !userId ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-3 py-3 text-xs text-stone-700">
            <PremiumRichText text="Inicia sesión para ver tu estado Premium." size="xs" />
          </div>
        ) : isPremium ? (
          <div className="rounded-2xl border border-[#88ab75]/35 bg-white px-3 py-3 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#eef4e6] text-[#556B2F]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1 text-sm font-semibold text-stone-900">
                  <PremiumLabel size="xs" /> {isPaidPremium ? "activo" : "disponible"}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
                  <PremiumRichText text="Acceso a funciones Premium." size="xs" />
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white px-3 py-3 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-stone-50 text-stone-600">
                <Lock className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-900">
                  <PremiumRichText text="Esta es una característica Premium." size="xs" />
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
                  Contrata Premium desde Perfil para desbloquearla.
                </p>
              </div>
            </div>

            <Link
              href={APP_ROUTES.perfil}
              className="mt-3 flex w-full items-center justify-center rounded-full bg-[#556B2F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4a5f28]"
            >
              Ir a Perfil
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
