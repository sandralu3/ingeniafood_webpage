import {
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  Clock,
  Crown,
  Leaf,
  Lightbulb,
  Menu,
  ScanLine,
  Sparkles,
  UserRound
} from "lucide-react";
import { MockupStatusTime } from "./MockupStatusTime";

const PANTRY_HERO_IMAGE = "/images/scanner/pantry-hero-fridge.png";

const CHIPS = [
  { emoji: "🥑", label: "Aguacate", delay: "0.9s" },
  { emoji: "🍅", label: "Tomate", delay: "1.25s" },
  { emoji: "🥚", label: "Huevos", delay: "1.6s" },
  { emoji: "🧀", label: "Mozzarella", delay: "1.95s" }
] as const;

export function MockupAppScreen() {
  return (
    <div className="flex h-full flex-col bg-[#FAF7F2] text-[#1a1c1b]">
      {/* Status */}
      <div className="flex items-center justify-between px-3.5 pb-1 pt-2.5 text-[9px] font-semibold text-[#1a1c1b]">
        <MockupStatusTime />
        <div className="flex items-center gap-0.5 opacity-70">
          <span className="h-1.5 w-2.5 rounded-[1px] bg-current" />
          <span className="h-1.5 w-2 rounded-[1px] bg-current/80" />
          <span className="h-2 w-3.5 rounded-[2px] border border-current/80">
            <span className="m-[1px] block h-1 w-2 rounded-[1px] bg-[#3E5A3A]" />
          </span>
        </div>
      </div>

      {/* App header */}
      <div className="flex items-center gap-1.5 px-2.5 pb-2">
        <Menu className="h-3.5 w-3.5 shrink-0 text-stone-700" strokeWidth={2} />
        <Leaf
          className="h-3.5 w-3.5 shrink-0 text-[#3E5A3A]"
          strokeWidth={2.25}
        />
        <span className="truncate text-[10px] font-bold tracking-tight text-stone-900">
          IngeniaFood
        </span>
        <span className="rounded-full bg-stone-200/80 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-stone-500">
          BETA
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-stone-600">
            <Crown className="h-2.5 w-2.5 text-[#C49520]" strokeWidth={2.25} />
            Premium
          </span>
          <Bell className="h-3 w-3 text-stone-500" strokeWidth={2} />
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e8ebe3] ring-1 ring-stone-200">
            <UserRound className="h-3 w-3 text-[#3E5A3A]" strokeWidth={2} />
          </span>
        </div>
      </div>

      {/* Scrollable body — clipped, no internal scroll behavior */}
      <div className="min-h-0 flex-1 overflow-hidden px-2.5">
        {/* Hero scan card */}
        <section className="overflow-hidden rounded-[14px] border border-stone-100/80 bg-[#FAF7F2] shadow-sm shadow-stone-200/50">
          <div className="relative flex min-h-[108px] items-stretch">
            <div className="relative z-10 flex w-[48%] min-w-0 flex-col justify-center p-2.5">
              <h2 className="text-[10px] font-bold leading-snug tracking-tight text-[#3E5A3A]">
                <span className="mr-0.5 text-[#C49520]" aria-hidden>
                  ✨
                </span>
                <span className="text-[#C49520]">Ingenia</span> tu próxima comida
                <span className="ml-0.5 text-[#C49520]" aria-hidden>
                  ✨
                </span>
              </h2>
              <p className="mt-1 text-[8px] leading-tight text-stone-600">
                Escanea tu nevera o despensa y crea recetas deliciosas al
                instante.
              </p>
              <div className="oliva-scan-sweep relative mt-2 inline-flex w-fit items-center gap-1 overflow-hidden rounded-full bg-gradient-to-br from-[#5C7A54] via-[#3E5A3A] to-[#2F452C] px-2.5 py-1.5 text-[9px] font-bold leading-none text-white shadow-sm shadow-[#3E5A3A]/30">
                <Camera className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                Escanear ahora
                <Sparkles
                  className="absolute -right-1 -top-1 h-2.5 w-2.5 text-[#C49520]"
                  strokeWidth={2.25}
                  aria-hidden
                />
              </div>
            </div>

            <div className="relative w-[52%] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PANTRY_HERO_IMAGE}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#FAF7F2] via-[#FAF7F2]/70 to-transparent" />
              <span className="pointer-events-none absolute left-1.5 top-1.5 h-2.5 w-2.5 border-l-2 border-t-2 border-white/95" />
              <span className="pointer-events-none absolute right-1.5 top-1.5 h-2.5 w-2.5 border-r-2 border-t-2 border-white/95" />
              <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-2.5 w-2.5 border-b-2 border-l-2 border-white/95" />
              <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-2.5 w-2.5 border-b-2 border-r-2 border-white/95" />
              <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#3E5A3A] shadow-md ring-2 ring-white/80">
                <Camera
                  className="h-2.5 w-2.5 text-white"
                  strokeWidth={2.25}
                  aria-hidden
                />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-stone-200/80 border-t border-stone-100 bg-white px-0.5 py-2">
            {(
              [
                { key: "detect", Icon: Leaf, label: "Detecta ingredientes" },
                { key: "suggest", Icon: Lightbulb, label: "Sugiere recetas" },
                { key: "time", Icon: Clock, label: "Ahorra tiempo" }
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                className="flex flex-col items-center justify-center gap-0.5 px-0.5 text-center"
              >
                <item.Icon
                  className="h-2.5 w-2.5 text-stone-500"
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="text-[7px] font-medium leading-tight text-stone-500">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Ingredientes a la mano */}
        <section className="mt-2 space-y-2 rounded-[14px] border border-stone-100 bg-white p-2.5 shadow-sm shadow-stone-200/50">
          <div>
            <h2 className="text-[11px] font-bold text-stone-800">
              Ingredientes a la mano
            </h2>
            <p className="mt-0.5 text-[8px] text-stone-500">
              Elige ingredientes frecuentes o busca nuevos
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[8px] font-semibold text-stone-500">
              Seleccionados ({CHIPS.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {CHIPS.map((chip) => (
                <span
                  key={chip.label}
                  className="oliva-chip-enter inline-flex items-center gap-0.5 rounded-full border border-[#3E5A3A]/30 bg-[#3E5A3A]/10 px-2 py-0.5 text-[9px] font-semibold text-[#3E5A3A]"
                  style={{ ["--oliva-chip-delay" as string]: chip.delay }}
                >
                  <span aria-hidden className="leading-none">
                    {chip.emoji}
                  </span>
                  <span>{chip.label}</span>
                  <span className="text-[8px] opacity-70" aria-hidden>
                    ✕
                  </span>
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Footer CTA + nav */}
      <div className="mt-auto px-2.5 pb-2 pt-1.5">
        <div className="oliva-cta-elevate">
          <div className="flex w-full items-center justify-center gap-1 rounded-full bg-gradient-to-br from-[#5C7A54] via-[#3E5A3A] to-[#2F452C] px-3 py-2.5 text-[10px] font-bold text-white shadow-md shadow-[#3E5A3A]/25">
            <span aria-hidden>✨</span>
            Generar receta con mi despensa
          </div>
        </div>

        <nav className="mt-2 flex items-center justify-between rounded-2xl border border-stone-100 bg-white px-1.5 py-1.5 shadow-sm">
          {(
            [
              { label: "Hoy", Icon: Sparkles, active: false },
              { label: "Plan", Icon: CalendarDays, active: false },
              { label: "Escáner", Icon: ScanLine, active: true },
              { label: "Guardadas", Icon: Bookmark, active: false },
              { label: "Perfil", Icon: UserRound, active: false }
            ] as const
          ).map((item) => (
            <div
              key={item.label}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1 ${
                item.active ? "bg-[#dce7c3]" : ""
              }`}
            >
              <item.Icon
                className={`h-3 w-3 ${
                  item.active ? "text-[#3E5A3A]" : "text-stone-400"
                }`}
                strokeWidth={2}
                aria-hidden
              />
              <span
                className={`text-[6.5px] font-semibold ${
                  item.active ? "text-[#3E5A3A]" : "text-stone-400"
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
