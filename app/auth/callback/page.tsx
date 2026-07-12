"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

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

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const code = searchParams.get("code");
    const next = searchParams.get("next");
    const type = searchParams.get("type");

    if (!code) {
      router.replace("/auth/confirm-email?error=link_expired");
      return;
    }

    if (type === "recovery") {
      const resetPasswordUrl = new URL("/auth/reset-password", window.location.origin);
      resetPasswordUrl.searchParams.set("code", code);
      resetPasswordUrl.searchParams.set("type", "recovery");
      router.replace(`${resetPasswordUrl.pathname}${resetPasswordUrl.search}`);
      return;
    }

    const confirmEmailUrl = new URL("/auth/confirm-email", window.location.origin);
    confirmEmailUrl.searchParams.set("code", code);
    if (type) {
      confirmEmailUrl.searchParams.set("type", type);
    }
    if (next) {
      confirmEmailUrl.searchParams.set("next", next);
    }
    router.replace(`${confirmEmailUrl.pathname}${confirmEmailUrl.search}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
        Preparando activación...
      </div>
    </div>
  );
}
