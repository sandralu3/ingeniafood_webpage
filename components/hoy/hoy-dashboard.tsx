"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ScanLine } from "lucide-react";
import { DailyChallenges } from "@/components/hoy/daily-challenges";
import { HoyGreetingHeader } from "@/components/hoy/hoy-greeting-header";
import { ProgressBoard } from "@/components/hoy/progress-board/progress-board";
import { SandraTipCard } from "@/components/home/sandra-tip-card";
import {
  getProfileInitials,
  resolveProfileFirstName
} from "@/components/shared/user-avatar";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { createSupabaseClient } from "@/lib/supabaseClient";

export function HoyDashboard() {
  const [healthScoreRefreshKey, setHealthScoreRefreshKey] = useState(0);
  const [displayName, setDisplayName] = useState("Chef");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("SV");

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setDisplayName(resolveProfileFirstName(profile?.full_name, user.email));
      setAvatarUrl(profile?.avatar_url ?? null);
      setInitials(getProfileInitials(profile?.full_name, user.email));
    };

    void loadProfile();
  }, []);

  return (
    <div className="-mx-4 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-white px-4 pb-6 pt-0">
      <section className="space-y-3">
        <HoyGreetingHeader
          displayName={displayName}
          avatarUrl={avatarUrl}
          initials={initials}
        />

        <Link
          href={APP_ROUTES.scanner}
          className="group flex items-center justify-between gap-2.5 overflow-hidden rounded-2xl border border-neutral-100 bg-white p-3 shadow-md shadow-stone-100/40 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-100/30"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#3e5219] to-[#6b8a3e] text-white shadow-md shadow-[#3e5219]/20 transition group-hover:scale-105">
              <ScanLine className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-bold text-stone-900">Escanea tu despensa</p>
              <p className="text-[11px] text-stone-500">Recetas saludables al instante</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-[#556B2F] transition group-hover:translate-x-0.5" />
        </Link>

        <ProgressBoard refreshKey={healthScoreRefreshKey} />

        <DailyChallenges
          onHealthScoreChange={() => setHealthScoreRefreshKey((key) => key + 1)}
        />

        <SandraTipCard />
      </section>
    </div>
  );
}
