"use client";

import { useState } from "react";
import type { GuideRelease } from "@/lib/marketing/beta-guide";
import { cn } from "@/lib/utils";

type Props = {
  releases: GuideRelease[];
};

/**
 * Fechas de despliegue: al pulsar una se ve solo ese día.
 * El resto de la guía no se desplaza con el historial.
 */
export function GuideReleasesPanel({ releases }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = releases.find((release) => release.id === selectedId) ?? null;

  if (releases.length === 0) return null;

  return (
    <section
      id="novedades-por-despliegue"
      className="mb-4 scroll-mt-24 rounded-2xl border border-[#d9d2c4] bg-white p-4 shadow-sm sm:mb-6 sm:rounded-[1.5rem] sm:p-5"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#556B2F]">
        Novedades por despliegue
      </p>
      <p className="mt-1 text-[13px] leading-snug text-stone-600">
        Pulsa una fecha para ver qué cambió ese día. El resto de la guía sigue igual
        debajo.
      </p>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {releases.map((release) => {
          const isActive = release.id === selectedId;
          return (
            <button
              key={release.id}
              type="button"
              onClick={() =>
                setSelectedId((current) => (current === release.id ? null : release.id))
              }
              aria-pressed={isActive}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition",
                isActive
                  ? "border-[#556B2F] bg-[#556B2F] text-white"
                  : "border-[#d9d2c4] bg-[#f5f2ed] text-[#3e5219] hover:border-[#556B2F]/50"
              )}
            >
              {release.dateLabel}
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="mt-3 max-h-[min(50vh,22rem)] overflow-y-auto rounded-xl border border-[#e7e5e4] bg-[#fdfcfb] p-3 sm:p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8f4c35]">
            {selected.dateLabel}
          </p>
          <div
            className="guide-prose"
            dangerouslySetInnerHTML={{ __html: selected.html }}
          />
        </div>
      ) : null}
    </section>
  );
}
