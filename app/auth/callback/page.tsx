"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { resolvePostAuthPath } from "@/lib/auth/resolve-post-auth-path";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackHandler />
    </Suspense>
  );
}

function AuthCallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
        Verificando enlace seguro...
      </div>
    </div>
  );
}

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasStarted = useRef(false);
  const [statusMessage, setStatusMessage] = useState("Verificando enlace seguro...");

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const code = searchParams.get("code");
    const next = searchParams.get("next");
    const type = searchParams.get("type");

    if (!code) {
      router.replace("/login?mode=forgot&error=missing_code");
      return;
    }

    const completeAuth = async () => {
      try {
        const supabase = createSupabaseClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          const isExpired =
            /expired|invalid|already been used|flow state/i.test(error.message) ||
            error.code === "otp_expired";

          if (isExpired) {
            router.replace("/auth/reset-password?error=link_expired");
            return;
          }

          router.replace("/login?mode=forgot&error=exchange_failed");
          return;
        }

        const destination = resolvePostAuthPath({ next, type });
        setStatusMessage("Redirigiendo...");
        router.replace(destination);
      } catch {
        router.replace("/login?mode=forgot&error=exchange_failed");
      }
    };

    void completeAuth();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
        {statusMessage}
      </div>
    </div>
  );
}
