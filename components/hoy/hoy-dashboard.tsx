"use client";

import Link from "next/link";
import { ArrowRight, ScanLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { DailyChallenges } from "@/components/hoy/daily-challenges";
import { HoyGreetingHeader } from "@/components/hoy/hoy-greeting-header";
import { ProgressBoard } from "@/components/hoy/progress-board/progress-board";
import { TodayPlanNutrition } from "@/components/hoy/today-plan-nutrition";
import { SandraTipCard } from "@/components/home/sandra-tip-card";
import {
  HoyDailyChallengesSkeleton,
  HoyProgressBoardSkeleton,
  HoyScanBannerSkeleton
} from "@/components/skeletons/hoy-dashboard-skeleton";
import { useHoyPageData } from "@/hooks/use-hoy-page-data";
import { APP_ROUTES } from "@/lib/navigation/app-routes";

export function HoyDashboard() {
  const t = useTranslations("Hoy");
  const { data, userId, profile, isLoading, isProfileLoading, refresh } = useHoyPageData();
  const showPageSkeleton = isLoading && !data;

  return (
    <div className="-mx-4 -mb-6 min-h-full bg-gradient-to-b from-stone-50 via-amber-50/20 to-sv-surface px-4 pb-6 pt-0">
      <section className="space-y-3">
        <HoyGreetingHeader
          displayName={profile?.displayName}
          avatarUrl={profile?.avatarUrl}
          initials={profile?.initials}
          isLoading={isProfileLoading}
        />

        {showPageSkeleton ? (
          <HoyScanBannerSkeleton />
        ) : (
          <Link
            href={APP_ROUTES.scanner}
            className="group flex items-center justify-between gap-2 overflow-hidden rounded-2xl bg-white/90 px-2.5 py-2 shadow-sm transition hover:bg-white"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#3e5219] to-[#6b8a3e] text-white shadow-sm">
                <ScanLine className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-xs font-bold text-stone-900">{t("scanBannerTitle")}</p>
                <p className="text-[10px] text-stone-500">{t("scanBannerSubtitle")}</p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#556B2F] transition group-hover:translate-x-0.5" />
          </Link>
        )}

        {showPageSkeleton ? (
          <HoyProgressBoardSkeleton showSectionLabel />
        ) : (
          <ProgressBoard data={data} isLoading={isLoading} />
        )}

        {showPageSkeleton ? null : <TodayPlanNutrition data={data} />}

        {showPageSkeleton ? (
          <HoyDailyChallengesSkeleton />
        ) : (
          <DailyChallenges
            userId={userId}
            challenges={data?.activeChallenges ?? []}
            completedIds={data?.todayCompletedIds ?? []}
            isLoading={isLoading}
            onDataChange={() => void refresh({ force: true })}
          />
        )}

        <SandraTipCard variant="hoy" />
      </section>
    </div>
  );
}
