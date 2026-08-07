"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TRY_PATH,
  INSTALL_ENTRY_PATH,
  buildAbsoluteUrl,
  buildQrImageUrl,
  shouldEnforceMobileQr
} from "@/components/oliva/try/device";
import { TryQrScreen } from "@/components/oliva/try/TryQrScreen";

/**
 * Entry for try/open app:
 * - Desktop (tunnel/prod): always show QR (even if the URL is pasted).
 * - Mobile / localhost: go to /app-recetas (install gate → then auth).
 */
export default function AppEntryPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "qr" | "redirect">("loading");

  const targetUrl = useMemo(() => buildAbsoluteUrl(TRY_PATH), []);
  const qrUrl = useMemo(() => buildQrImageUrl(targetUrl), [targetUrl]);

  useEffect(() => {
    if (shouldEnforceMobileQr()) {
      setMode("qr");
      return;
    }
    setMode("redirect");
    router.replace(INSTALL_ENTRY_PATH);
  }, [router]);

  if (mode === "qr") {
    return <TryQrScreen targetUrl={targetUrl} qrUrl={qrUrl} />;
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-[#fbf9f4]">
      <p className="text-sm text-[#86736d]">Preparando IngeniaFood…</p>
    </section>
  );
}
