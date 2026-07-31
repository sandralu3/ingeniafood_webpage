"use client";

import Link from "next/link";
import Image from "next/image";
import { Camera, ScanLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { DailyChallenges } from "@/components/hoy/daily-challenges";
import { HoyGreetingHeader } from "@/components/hoy/hoy-greeting-header";
import { ProgressBoard } from "@/components/hoy/progress-board/progress-board";
import { PromoClaimBanner } from "@/components/hoy/promo-claim-banner";
import { TodayPlanNutrition } from "@/components/hoy/today-plan-nutrition";
import {
  HoyDailyChallengesSkeleton,
  HoyProgressBoardSkeleton,
  HoyScanBannerSkeleton
} from "@/components/skeletons/hoy-dashboard-skeleton";
import { useHoyPageData } from "@/hooks/use-hoy-page-data";
import { APP_ROUTES } from "@/lib/navigation/app-routes";

/** Ensalada / bowl — visual hero del mock. */
const SCAN_HERO_IMAGE =
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80";

function deriveLevelLabel(earnedPoints: number): string {
  const level = Math.max(1, Math.floor(earnedPoints / 100) + 1);
  return `Nivel ${level} / +${earnedPoints} pts`;
}

export function HoyDashboard() {
  const t = useTranslations("Hoy");
  const { data, userId, profile, isLoading, isProfileLoading, refresh } = useHoyPageData();
  const showPageSkeleton = isLoading && !data;
  const earnedPoints = data?.metrics.earnedPoints ?? 0;
  const levelLabel = data ? deriveLevelLabel(earnedPoints) : null;

  return (
    <div className="-mx-4 min-h-full bg-[#FAF7F2] px-4 pb-2 pt-2">
      <section className="space-y-3.5">
        <HoyGreetingHeader
          displayName={profile?.displayName}
          isLoading={isProfileLoading}
          levelLabel={levelLabel}
        />

        {showPageSkeleton ? (
          <HoyScanBannerSkeleton />
        ) : (
          <Link
            href={APP_ROUTES.scanner}
            className="relative flex min-h-[148px] items-center overflow-hidden rounded-[22px] bg-gradient-to-r from-[#E8EDE3] via-[#E3E8DC] to-[#D5DFD0] p-4 shadow-sm shadow-stone-200/50 transition hover:brightness-[0.99]"
          >
            <div className="relative z-10 flex min-w-0 max-w-[58%] items-start gap-3 pr-2">
              <span className="relative mt-0.5 inline-flex shrink-0 rounded-2xl bg-[#3E5A3A] p-2.5 text-white shadow-sm">
                <ScanLine className="h-4 w-4" strokeWidth={1.75} />
                <span
                  className="pointer-events-none absolute -right-1 -top-1.5 text-[8px] leading-none text-[#F9A825]"
                  aria-hidden
                >
                  ✦
                </span>
                <span
                  className="pointer-events-none absolute -right-2.5 top-1 text-[6px] leading-none text-[#F9A825]/90"
                  aria-hidden
                >
                  ✦
                </span>
                <span
                  className="pointer-events-none absolute right-0 -top-2.5 text-[5px] leading-none text-[#F9A825]/80"
                  aria-hidden
                >
                  ✦
                </span>
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold leading-snug text-stone-800">
                  {t.has("scanHeroTitle")
                    ? t("scanHeroTitle").replace(/📸\s*/, "")
                    : "Escanea tu despensa"}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-stone-600">
                  {t.has("scanHeroSubtitle")
                    ? t("scanHeroSubtitle")
                    : "Sube foto de tus ingredientes y la IA creará tu receta al instante."}
                </p>
                <span className="mt-3 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-br from-[#5C7A54] via-[#3E5A3A] to-[#2F452C] px-3 py-1.5 text-[11px] font-bold leading-none text-white shadow-sm shadow-[#3E5A3A]/25 transition hover:brightness-110">
                  <Camera className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {t.has("scanHeroCta") ? t("scanHeroCta") : "Escanear ingredientes"}
                </span>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-y-0 right-0 w-[48%]">
              <Image
                src={SCAN_HERO_IMAGE}
                alt=""
                fill
                className="object-cover object-[center_35%]"
                sizes="200px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#E3E8DC] via-[#E3E8DC]/55 to-transparent" />
            </div>
          </Link>
        )}

        <PromoClaimBanner />

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
          <div className="h-36 animate-pulse rounded-[22px] bg-stone-100/80" aria-hidden />
        ) : (
          <TodayPlanNutrition
            data={data}
            userId={userId}
            onPlanUpdated={() => {
              void refresh({ force: true });
            }}
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
