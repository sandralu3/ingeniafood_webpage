"use client";

import { RefreshCw, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAppUpdate } from "@/hooks/use-app-update";
import { cn } from "@/lib/utils";

type AppUpdateBannerProps = {
  className?: string;
};

export function AppUpdateBanner({ className }: AppUpdateBannerProps) {
  const t = useTranslations("Common");
  const pathname = usePathname();
  const { updateAvailable, isUpdating, applyUpdate, dismissUpdate } = useAppUpdate();
  const isAppRecetasRoute = pathname?.startsWith("/app-recetas") ?? false;

  if (!updateAvailable) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-[45] px-4",
        isAppRecetasRoute
          ? "bottom-[calc(var(--app-bottom-nav-height)+env(safe-area-inset-bottom,0px)+0.5rem)]"
          : "bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-[#556B2F]/25 bg-white/95 px-4 py-3 shadow-lg shadow-stone-300/40 backdrop-blur-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#556B2F]/10 text-[#556B2F]">
          <RefreshCw className={cn("h-4 w-4", isUpdating && "animate-spin")} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900">{t("updateAvailable")}</p>
          <p className="text-xs text-stone-500">{t("updateHint")}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={dismissUpdate}
            disabled={isUpdating}
            className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50"
            aria-label={t("remindLater")}
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={applyUpdate}
            disabled={isUpdating}
            className="rounded-full bg-[#556B2F] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#4a5f28] disabled:opacity-60"
          >
            {isUpdating ? t("updating") : t("update")}
          </button>
        </div>
      </div>
    </div>
  );
}
