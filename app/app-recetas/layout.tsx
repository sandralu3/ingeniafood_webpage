import type { Metadata } from "next";
import { Header } from "@/components/shared/header";
import { BottomNav } from "@/components/shared/bottom-nav";

export const metadata: Metadata = {
  manifest: "/manifest.json"
};

export default function AppRecetasLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-sv-surface text-sv-on-surface">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-20">
        <Header />
        <main className="flex-1 px-4 py-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
