"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ScanLine } from "lucide-react";
import { DailyChallenges } from "@/components/hoy/daily-challenges";
import { WeeklyHealthScore } from "@/components/hoy/weekly-health-score";
import { SandraTipCard } from "@/components/home/sandra-tip-card";
import { APP_ROUTES } from "@/lib/navigation/app-routes";

type HoyDashboardProps = {
  userName?: string;
};

export function HoyDashboard({ userName = "Chef" }: HoyDashboardProps) {
  const [healthScoreRefreshKey, setHealthScoreRefreshKey] = useState(0);

  return (
    <div className="-mx-4 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-white px-4 pb-8 pt-1">
      <section className="space-y-5">
        <header className="px-0.5 pt-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700/70">
            Tu día
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-stone-900">
            Hola, {userName}
          </h1>
          <p className="mt-1 text-sm text-stone-500">Hábitos, energía y cocina inteligente.</p>
        </header>

        <WeeklyHealthScore refreshKey={healthScoreRefreshKey} />

        <DailyChallenges
          onHealthScoreChange={() => setHealthScoreRefreshKey((key) => key + 1)}
        />

        <Link
          href={APP_ROUTES.scanner}
          className="group flex items-center justify-between gap-3 overflow-hidden rounded-3xl border border-neutral-100 bg-white p-4 shadow-xl shadow-stone-100/50 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-amber-100/40"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3e5219] to-[#6b8a3e] text-white shadow-lg shadow-[#3e5219]/25 transition group-hover:scale-105">
              <ScanLine className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-bold text-stone-900">Escanea tu despensa</p>
              <p className="text-xs text-stone-500">Recetas saludables al instante</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-[#556B2F] transition group-hover:translate-x-0.5" />
        </Link>

        <SandraTipCard />
      </section>
    </div>
  );
}
