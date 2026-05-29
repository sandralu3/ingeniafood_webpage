"use client";

import { Sparkles } from "lucide-react";

type Props = {
  tipSandra: string;
};

/** Visible solo durante la captura (`recipe-share-capturing` en globals.css). */
export function RecipeShareBranding({ tipSandra }: Props) {
  return (
    <div data-share-only className="mt-4 space-y-4">
      {tipSandra.trim() ? (
        <section className="rounded-xl border border-[#556B2F]/20 bg-[#F0F4ED] p-4">
          <p className="inline-flex items-center gap-2 text-sm font-bold tracking-wide text-[#556B2F]">
            <Sparkles className="h-4 w-4 shrink-0" />
            El Tip de Sandra
          </p>
          <p className="mt-2 text-sm italic leading-relaxed text-sv-on-surface-variant">
            {tipSandra}
          </p>
        </section>
      ) : null}

      <footer className="border-t border-sv-outline-variant/20 pt-4">
        <p className="text-sm font-bold text-sv-primary">Generado con IngeniaFood</p>
        <p className="mt-1 text-xs text-sv-on-surface-variant">
          Tu asistente de cocina saludable
        </p>
      </footer>
    </div>
  );
}
