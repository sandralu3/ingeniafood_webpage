import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import { SupabaseAuthRedirect } from "@/components/auth/supabase-auth-redirect";
import { AppUpdateBanner } from "@/components/shared/app-update-banner";
import { ChunkLoadRecovery } from "@/components/shared/chunk-load-recovery";
import { APP_ICON_METADATA } from "@/lib/metadata/app-icons";
import "./globals.css";

export const metadata: Metadata = {
  title: "IngeniaFood",
  description: "App de recetas inteligentes con IA. Tu ingeniero culinario personal.",
  applicationName: "IngeniaFood",
  manifest: "/manifest.json",
  ...APP_ICON_METADATA,
  openGraph: {
    title: "IngeniaFood",
    description: "App de recetas inteligentes con IA. Tu ingeniero culinario personal.",
    siteName: "IngeniaFood",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Logo de IngeniaFood"
      }
    ],
    locale: "es_ES",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "IngeniaFood",
    description: "App de recetas inteligentes con IA. Tu ingeniero culinario personal.",
    images: ["/icons/icon-512.png"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AppProviders>
          <SupabaseAuthRedirect />
          <ChunkLoadRecovery />
          <AppUpdateBanner />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
