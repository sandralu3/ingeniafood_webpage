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
  resolvePremiumAccess,
  type PremiumAccess,
  type PremiumProfileRow
} from "@/lib/auth/premium-access";
import { createSupabaseClient } from "@/lib/supabaseClient";

type UsePremiumResult = PremiumAccess & {
  userId: string | null;
  /** Puede usar funciones Premium (suscripción / is_premium de pago). */
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Actualiza el estado Premium en memoria (p. ej. tras autogestión sin esperar al fetch). */
  applyPremiumProfile: (profile: PremiumProfileRow, email?: string | null) => void;
};

const PREMIUM_PROFILE_SELECT =
  "is_premium, is_tester, openai_photo_credits, premium_trial_remaining, premium_trial_claimed_at" as const;

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

  const refresh = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? false;

    const runRefresh = async () => {
      if (showLoading) {
        setIsLoading(true);
      }
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
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(PREMIUM_PROFILE_SELECT)
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          setError("No pudimos cargar tu estado Premium.");
          setAccess(resolvePremiumAccess(null, { email: user.email }));
          return;
        }

        setAccess(resolvePremiumAccess(profile, { email: user.email }));
      } catch {
        setError("No pudimos cargar tu estado Premium.");
        setAccess(resolvePremiumAccess(null));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    };

    const queued = refreshQueueRef.current.then(runRefresh, runRefresh);
    refreshQueueRef.current = queued;
    await queued;
  }, []);

  useEffect(() => {
    void refresh({ showLoading: true });
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
 * isPremium = canUsePremiumFeatures (Premium de pago).
 * Requiere PremiumProvider en el árbol de componentes.
 */
export function usePremium(): UsePremiumResult {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error("usePremium debe usarse dentro de PremiumProvider.");
  }
  return context;
}
