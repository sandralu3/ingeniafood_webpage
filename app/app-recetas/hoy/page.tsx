"use client";

import { useEffect, useState } from "react";
import { HoyDashboard } from "@/components/hoy/hoy-dashboard";
import { createSupabaseClient } from "@/lib/supabaseClient";

function resolveUserGreetingName(fullName: string | null, email: string | null): string {
  const trimmed = fullName?.trim();
  if (trimmed) {
    return trimmed.split(/\s+/)[0] ?? trimmed;
  }
  if (email) {
    const localPart = email.split("@")[0] ?? "Chef";
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }
  return "Chef";
}

export default function HoyPage() {
  const [userName, setUserName] = useState("Chef");

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setUserName(resolveUserGreetingName(profile?.full_name ?? null, user.email ?? null));
    };

    void loadUser();
  }, []);

  return <HoyDashboard userName={userName} />;
}
