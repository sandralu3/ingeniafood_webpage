"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserAuthUser } from "@/lib/auth/get-browser-user";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";

export type SandraAdminGateState = "loading" | "allowed" | "denied";

/**
 * Verifica acceso admin en cliente sin dejar la pantalla colgada si falla getUser.
 */
export function useSandraAdminGate(loginNextPath: string): SandraAdminGateState {
  const router = useRouter();
  const [authState, setAuthState] = useState<SandraAdminGateState>("loading");

  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      try {
        const user = await getBrowserAuthUser();
        if (!active) return;

        if (!user) {
          setAuthState("denied");
          router.replace(`/login?next=${encodeURIComponent(loginNextPath)}`);
          return;
        }

        if (!isSandraAdmin(user.email)) {
          setAuthState("denied");
          return;
        }

        setAuthState("allowed");
      } catch (error) {
        console.error("[admin] verifyAccess", error);
        if (!active) return;
        setAuthState("denied");
      }
    };

    void verifyAccess();

    return () => {
      active = false;
    };
  }, [loginNextPath, router]);

  return authState;
}
