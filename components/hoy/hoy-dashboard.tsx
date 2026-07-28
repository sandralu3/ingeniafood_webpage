"use client";

import Link from "next/link";
import { ArrowRight, ScanLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { DailyChallenges } from "@/components/hoy/daily-challenges";
import { HoyGreetingHeader } from "@/components/hoy/hoy-greeting-header";
import { ProgressBoard } from "@/components/hoy/progress-board/progress-board";
import { TodayPlanNutrition } from "@/components/hoy/today-plan-nutrition";
import {
  HoyDailyChallengesSkeleton,
  HoyProgressBoardSkeleton,
  HoyScanBannerSkeleton
} from "@/components/skeletons/hoy-dashboard-skeleton";
import { useHoyPageData } from "@/hooks/use-hoy-page-data";
import { usePremium } from "@/hooks/use-premium";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

export function HoyDashboard() {
  const t = useTranslations("Hoy");
  const { isPremium, isLoading: isPremiumLoading } = usePremium();
  const { data, userId, profile, isLoading, isProfileLoading, refresh } = useHoyPageData();
  const showPageSkeleton = isLoading && !data;
  const premiumLayout = isPremium && !isPremiumLoading;

  return (
    <div
      className={cn(
        "-mx-4 -mb-6 min-h-full px-4 pb-6 pt-0",
        premiumLayout
          ? "bg-gradient-to-b from-[#F7F8F4] via-emerald-50/20 to-sv-surface"
          : "bg-gradient-to-b from-stone-50 via-emerald-50/15 to-sv-surface"
      )}
    >
      <section className={cn(premiumLayout ? "space-y-4" : "space-y-2.5")}>
        <HoyGreetingHeader
          displayName={profile?.displayName}
          avatarUrl={profile?.avatarUrl}
          initials={profile?.initials}
          isLoading={isProfileLoading}
          className={premiumLayout ? "border-b-0 pb-0" : undefined}
        />

        {showPageSkeleton ? (
          <HoyScanBannerSkeleton />
        ) : (
          <Link
            href={APP_ROUTES.scanner}
            className="group flex items-center justify-between gap-2.5 overflow-hidden rounded-2xl border border-[#556B2F]/10 bg-[#eef4e6]/80 px-3 py-2.5 shadow-sm transition hover:border-[#556B2F]/20 hover:bg-[#eef4e6] hover:shadow-md"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-800 shadow-sm">
                <ScanLine className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-bold text-emerald-950">{t("scanBannerTitle")}</p>
                <p className="text-[11px] text-emerald-800/70">{t("scanBannerSubtitle")}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-emerald-700 transition group-hover:translate-x-0.5" />
          </Link>
        )}

        {showPageSkeleton ? (
          <HoyProgressBoardSkeleton showSectionLabel={false} />
        ) : (
          <ProgressBoard
            data={data}
            isLoading={isLoading}
            firstName={profile?.displayName}
          />
        )}

        {showPageSkeleton ? (
          <div className="h-28 animate-pulse rounded-2xl bg-stone-100/80" aria-hidden />
        ) : (
          <TodayPlanNutrition
            data={data}
            userId={userId}
            onPlanUpdated={() => void refresh({ force: true })}
            className={
              premiumLayout
                ? "border-0 bg-transparent shadow-none ring-0"
                : undefined
            }
          />
        )}

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
      </section>
    </div>
  );
}
