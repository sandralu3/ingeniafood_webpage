import { ExternalLink, Instagram, ScanLine, CalendarDays } from "lucide-react";
import { SANDRA_INSTAGRAM_HANDLE, SANDRA_INSTAGRAM_URL } from "@/lib/content/social-links";
import { cn } from "@/lib/utils";

type PlanInstagramPromoProps = {
  className?: string;
};

const STEPS = [
  {
    icon: Instagram,
    title: "Mira el reel en Instagram",
    description: "Inspírate con las recetas de Sandra en video."
  },
  {
    icon: ScanLine,
    title: "Guárdala en la app",
    description: "Pega el enlace del reel en el escáner o créala con tus ingredientes."
  },
  {
    icon: CalendarDays,
    title: "Añádela a tu plan",
    description: "Guárdala y asígnala a desayuno, almuerzo o cena."
  }
] as const;

export function PlanInstagramPromo({ className }: PlanInstagramPromoProps) {
  return (
    <aside
      className={cn(
        "overflow-hidden rounded-3xl border border-neutral-100 bg-white/90 px-4 py-5 shadow-xl shadow-stone-100/50",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f9ce34]/30 via-[#ee2a7b]/20 to-[#6228d7]/20 text-[#C13584]">
          <Instagram className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            Recetas en Instagram
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Los videos de Sandra viven en Instagram. En la app las conviertes en recetas
            guardadas para tu plan semanal.
          </p>
        </div>
      </div>

      <ol className="mt-4 space-y-2.5">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="flex items-start gap-3 rounded-2xl border border-stone-100 bg-stone-50/70 px-3 py-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#556B2F] shadow-sm">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
                  <Icon className="h-3.5 w-3.5 text-[#556B2F]" strokeWidth={2} />
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <a
        href={SANDRA_INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#C13584]/20 bg-gradient-to-r from-[#fdf2f8] to-[#fff7ed] px-4 py-3 text-sm font-semibold text-[#9d174d] transition hover:border-[#C13584]/35 hover:shadow-md"
      >
        <Instagram className="h-4 w-4" />
        Ver recetas en {SANDRA_INSTAGRAM_HANDLE}
        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
      </a>
    </aside>
  );
}
