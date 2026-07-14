"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { AppDrawer } from "@/components/shared/app-drawer";
import { IngeniaFoodLogo } from "@/components/shared/ingenia-food-logo";
import { UserAvatar, getProfileInitials } from "@/components/shared/user-avatar";
import { PremiumLabel } from "@/components/premium/premium-label";
import { usePremium } from "@/hooks/use-premium";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { createSupabaseClient } from "@/lib/supabaseClient";

function shouldHideHeaderAvatar(pathname: string): boolean {
  return pathname === APP_ROUTES.hoy || pathname === APP_ROUTES.root;
}

export function Header() {
  const pathname = usePathname();
  const { isPremium, isLoading: isPremiumLoading } = usePremium();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("SV");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const hideAvatar = shouldHideHeaderAvatar(pathname);

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
      <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-sv-outline-variant/30 bg-sv-surface/80 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="text-sv-primary-container transition hover:opacity-80"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <IngeniaFoodLogo />
        </div>

        {!hideAvatar || (isPremium && !isPremiumLoading) ? (
          <div className="ml-3 flex shrink-0 items-center gap-2">
            {isPremium && !isPremiumLoading ? (
              <span title="Plan Premium activo">
                <PremiumLabel size="2xs" />
              </span>
            ) : null}
            {!hideAvatar ? (
              <Link href={APP_ROUTES.perfil} className="transition hover:opacity-90">
                <UserAvatar avatarUrl={avatarUrl} initials={initials} />
              </Link>
            ) : null}
          </div>
        ) : null}
      </header>

      <AppDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
