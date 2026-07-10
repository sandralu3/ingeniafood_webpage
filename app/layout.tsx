import type { Metadata } from "next";
import { SupabaseAuthRedirect } from "@/components/auth/supabase-auth-redirect";
import './globals.css';

export const metadata: Metadata = {
  title: "Sandra Vergara | IngeniaFood",
  description: "Landing oficial de Sandra Vergara e IngeniaFood.",
  manifest: "/manifest.json"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <SupabaseAuthRedirect />
        {children}
      </body>
    </html>
  );
}
