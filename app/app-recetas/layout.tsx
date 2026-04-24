import type { Metadata } from "next";
import { AppRecetasAccessGate } from "@/components/shared/app-recetas-access-gate";

export const metadata: Metadata = {
  manifest: "/manifest.json"
};

export default function AppRecetasLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppRecetasAccessGate>{children}</AppRecetasAccessGate>;
}
