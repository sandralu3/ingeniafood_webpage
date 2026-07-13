"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

type HoyGreetingHeaderProps = {
  displayName?: string | null;
  avatarUrl?: string | null;
  initials?: string;
  isLoading?: boolean;
  className?: string;
};

export function HoyGreetingHeader({
  displayName,
  avatarUrl,
  initials = "SV",
  isLoading = false,
  className
}: HoyGreetingHeaderProps) {
  const showNameSkeleton = isLoading || !displayName;

  return (
    <header
      className={cn(
        "flex w-full items-center justify-between gap-3 border-b border-stone-100 pb-2",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-wide text-stone-400">Tu día en marcha</p>
        {showNameSkeleton ? (
          <Skeleton silent className="mt-1 h-6 w-28 rounded-md" />
        ) : (
          <h1 className="truncate text-lg font-bold leading-tight text-stone-800">{displayName}</h1>
        )}
      </div>

      <Link
        href={APP_ROUTES.perfil}
        className="shrink-0 transition hover:opacity-90"
        aria-label="Ir a tu perfil"
      >
        {showNameSkeleton ? (
          <Skeleton silent className="h-10 w-10 rounded-full" />
        ) : (
          <UserAvatar avatarUrl={avatarUrl} initials={initials} size="md" />
        )}
      </Link>
    </header>
  );
}
