"use client";

import { useEffect, useMemo, useState } from "react";
import { Leaf, Menu } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";

function getInitials(name?: string | null, email?: string | null): string {
  const base = name?.trim() || email?.trim() || "SV";
  const parts = base.split(/\s+/).filter(Boolean);
  if (!parts.length) return "SV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function Header() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("SV");

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

      setInitials(getInitials(user.user_metadata?.full_name as string | undefined, user.email));

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (isCancelled) return;

      setAvatarUrl(profile?.avatar_url ?? null);
      setInitials(getInitials(profile?.full_name, user.email));
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

  const avatarContent = useMemo(() => {
    if (avatarUrl) {
      return <img src={avatarUrl} alt="Perfil" className="h-full w-full object-cover" />;
    }
    return <span className="text-[11px] font-semibold text-brand-green-dark">{initials}</span>;
  }, [avatarUrl, initials]);

  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-sv-outline-variant/30 bg-sv-surface/80 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          className="text-sv-primary-container transition hover:opacity-80"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="min-w-0 font-sans leading-tight">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-sv-on-surface-variant">
            Sandra Vergara
          </p>
          <div className="flex items-center gap-1">
            <Leaf className="h-3.5 w-3.5 shrink-0 text-[#556B2F]" strokeWidth={2} />
            <p className="truncate text-sm tracking-tight text-sv-on-surface">
              <span className="font-semibold">Ingenia</span>
              <span className="font-semibold text-[#556B2F]">Food</span>
            </p>
          </div>
        </div>
      </div>
      <div className="relative ml-3 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sv-surface-low ring-1 ring-sv-outline-variant/40">
        {avatarContent}
      </div>
    </header>
  );
}
