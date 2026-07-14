import type { Metadata } from "next";
import { AppRecetasAccessGate } from "@/components/shared/app-recetas-access-gate";
import { PremiumProvider } from "@/hooks/use-premium";
import { ScannerResetProvider } from "@/lib/scanner/scanner-reset-context";
import { APP_ICON_METADATA } from "@/lib/metadata/app-icons";

export const metadata: Metadata = {
  title: "IngeniaFood",
  applicationName: "IngeniaFood",
  manifest: "/manifest.json",
  ...APP_ICON_METADATA
};

export default function AppRecetasLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PremiumProvider>
      <ScannerResetProvider>
        <AppRecetasAccessGate>{children}</AppRecetasAccessGate>
      </ScannerResetProvider>
    </PremiumProvider>
  );
}
