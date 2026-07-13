"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import { ADMIN_PREMIUM_ACCESS, resolvePremiumAccess, type PremiumAccess } from "@/lib/auth/premium-access";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";

import { createSupabaseClient } from "@/lib/supabaseClient";



type UsePremiumResult = PremiumAccess & {

  userId: string | null;

  /** Puede usar funciones Premium (pago o prueba con usos restantes). */

  isPremium: boolean;

  isLoading: boolean;

  error: string | null;

  refresh: () => Promise<void>;

};



const PREMIUM_PROFILE_SELECT =

  "is_premium, premium_trial_remaining, premium_trial_claimed_at" as const;



/**

 * Carga el plan premium del usuario sin parpadeos.

 * isPremium = canUsePremiumFeatures (pago o prueba activa).

 */

export function usePremium(): UsePremiumResult {

  const [userId, setUserId] = useState<string | null>(null);

  const [access, setAccess] = useState<PremiumAccess>(() => resolvePremiumAccess(null));

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);



  const refresh = useCallback(async () => {

    const requestId = ++requestIdRef.current;

    setIsLoading(true);

    setError(null);



    try {

      const supabase = createSupabaseClient();

      const {

        data: { user },

        error: userError

      } = await supabase.auth.getUser();



      if (requestId !== requestIdRef.current) return;



      if (userError || !user) {

        setUserId(null);

        setAccess(resolvePremiumAccess(null));

        setIsLoading(false);

        return;

      }



      setUserId(user.id);

      if (isSandraAdmin(user.email)) {
        setAccess(ADMIN_PREMIUM_ACCESS);
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase

        .from("profiles")

        .select(PREMIUM_PROFILE_SELECT)

        .eq("id", user.id)

        .maybeSingle();



      if (requestId !== requestIdRef.current) return;



      if (profileError) {

        setError("No pudimos cargar tu estado Premium.");

        setAccess(resolvePremiumAccess(null));

        setIsLoading(false);

        return;

      }



      setAccess(resolvePremiumAccess(profile, { email: user.email }));

      setIsLoading(false);

    } catch {

      if (requestId !== requestIdRef.current) return;

      setError("No pudimos cargar tu estado Premium.");

      setAccess(resolvePremiumAccess(null));

      setIsLoading(false);

    }

  }, []);



  useEffect(() => {

    void refresh();

  }, [refresh]);



  return {

    userId,

    isPremium: access.canUsePremiumFeatures,

    isLoading,

    error,

    refresh,

    ...access

  };

}


