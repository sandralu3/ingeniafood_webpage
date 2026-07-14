"use client";

import { Sparkles, X } from "lucide-react";
import { PremiumRichText } from "@/components/premium/premium-label";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function GenerationsLimitModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="generations-limit-title"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#556B2F]/15 bg-gradient-to-b from-[#FDFCFB] via-white to-[#F0F4ED]/80 p-6 shadow-2xl shadow-[#3e5219]/10"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#556B2F]/15 to-[#3e5219]/10">
          <Sparkles className="h-7 w-7 text-[#556B2F]" strokeWidth={1.5} />
        </div>

        <h2
          id="generations-limit-title"
          className="text-center font-serif text-xl font-semibold tracking-tight text-stone-800"
        >
          Has completado tus 5 pruebas gratuitas
        </h2>

        <p className="mt-3 text-center text-sm leading-relaxed text-stone-600">
          <PremiumRichText
            text="¡Gracias por formar parte de IngeniaFood! Muy pronto abriremos la versión premium."
            size="xs"
          />
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-[#3e5219] to-[#556B2F] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#3e5219]/20 transition hover:brightness-105"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
