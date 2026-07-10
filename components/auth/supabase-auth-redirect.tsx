"use client";

import { useEffect } from "react";
import { resolveSupabaseAuthLandingUrl } from "@/lib/auth/resolve-supabase-auth-landing";

export function SupabaseAuthRedirect() {
  useEffect(() => {
    const target = resolveSupabaseAuthLandingUrl({
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      origin: window.location.origin
    });

    if (target && target !== window.location.href) {
      window.location.replace(target);
    }
  }, []);

  return null;
}
