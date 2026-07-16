import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
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

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>
            <SupabaseAuthRedirect />
            <ChunkLoadRecovery />
            <AppUpdateBanner />
            {children}
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
