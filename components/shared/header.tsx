"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, Menu } from "lucide-react";
import { AppDrawer } from "@/components/shared/app-drawer";
import { IngeniaFoodLogo } from "@/components/shared/ingenia-food-logo";
import { UserAvatar, getProfileInitials } from "@/components/shared/user-avatar";
import { PremiumLabel } from "@/components/premium/premium-label";
import { usePremium } from "@/hooks/use-premium";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

function isHoyPath(pathname: string): boolean {
  return pathname === APP_ROUTES.hoy || pathname === APP_ROUTES.root;
}

export function Header() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { isPremium, isLoading: isPremiumLoading } = usePremium();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("SV");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const onHoy = isHoyPath(pathname);

  useEffect(() => {
    const supabase = createSupabaseClient();
    let isCancelled = false;

    const syncProfile = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user || isCancelled) {
        setAvatarUrl(null);
        setInitials("SV");
        return;
      }

      setInitials(getProfileInitials(user.user_metadata?.full_name as string | undefined, user.email));

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (isCancelled) return;

      setAvatarUrl(profile?.avatar_url ?? null);
      setInitials(getProfileInitials(profile?.full_name, user.email));
    };

    void syncProfile();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void syncProfile();
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <header
        className={cn(
          "relative z-40 flex w-full shrink-0 items-center justify-between border-b px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-6",
          onHoy
            ? "border-stone-200/40 bg-[#FAF7F2]/95"
            : "border-sv-outline-variant/30 bg-sv-surface/95"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="text-sv-primary-container transition hover:opacity-80"
            aria-label={t("openMenu")}
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <IngeniaFoodLogo />
        </div>

        <div className="ml-3 flex shrink-0 items-center gap-2">
          {isPremium && !isPremiumLoading ? (
            <span title="Plan Premium activo">
              <PremiumLabel size="2xs" />
            </span>
          ) : null}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
            aria-label="Notificaciones"
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <Link href={APP_ROUTES.perfil} className="transition hover:opacity-90">
            <UserAvatar avatarUrl={avatarUrl} initials={initials} />
          </Link>
        </div>
      </header>

      <AppDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
