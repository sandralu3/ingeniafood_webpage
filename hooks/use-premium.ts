"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  ADMIN_PREMIUM_ACCESS,
  resolvePremiumAccess,
  type PremiumAccess,
  type PremiumProfileRow
} from "@/lib/auth/premium-access";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import { createSupabaseClient } from "@/lib/supabaseClient";

type UsePremiumResult = PremiumAccess & {
  userId: string | null;
  /** Puede usar funciones Premium (pago o prueba con usos restantes). */
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Actualiza el estado Premium en memoria (p. ej. tras autogestión sin esperar al fetch). */
  applyPremiumProfile: (profile: PremiumProfileRow, email?: string | null) => void;
};

const PREMIUM_PROFILE_SELECT =
  "is_premium, premium_trial_remaining, premium_trial_claimed_at" as const;

const PremiumContext = createContext<UsePremiumResult | null>(null);

function usePremiumState(): UsePremiumResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<PremiumAccess>(() => resolvePremiumAccess(null));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshQueueRef = useRef(Promise.resolve());

  const applyPremiumProfile = useCallback((profile: PremiumProfileRow, email?: string | null) => {
    setAccess(resolvePremiumAccess(profile, { email }));
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    const runRefresh = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createSupabaseClient();
        const {
          data: { user },
          error: userError
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setUserId(null);
          setAccess(resolvePremiumAccess(null));
          return;
        }

        setUserId(user.id);
        if (isSandraAdmin(user.email)) {
          setAccess(ADMIN_PREMIUM_ACCESS);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(PREMIUM_PROFILE_SELECT)
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          setError("No pudimos cargar tu estado Premium.");
          setAccess(resolvePremiumAccess(null));
          return;
        }

        setAccess(resolvePremiumAccess(profile, { email: user.email }));
      } catch {
        setError("No pudimos cargar tu estado Premium.");
        setAccess(resolvePremiumAccess(null));
      } finally {
        setIsLoading(false);
      }
    };

    const queued = refreshQueueRef.current.then(runRefresh, runRefresh);
    refreshQueueRef.current = queued;
    await queued;
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
    applyPremiumProfile,
    ...access
  };
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const value = usePremiumState();
  return createElement(PremiumContext.Provider, { value }, children);
}

/**
 * Carga el plan premium del usuario sin parpadeos.
 * isPremium = canUsePremiumFeatures (pago o prueba activa).
 * Requiere PremiumProvider en el árbol de componentes.
 */
export function usePremium(): UsePremiumResult {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error("usePremium debe usarse dentro de PremiumProvider.");
  }
  return context;
}
