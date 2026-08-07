import Link from "next/link";
import type { ReactNode } from "react";

type OlivaPlaceholderPageProps = {
  title: string;
  children: ReactNode;
};

export function OlivaPlaceholderPage({
  title,
  children
}: OlivaPlaceholderPageProps) {
  return (
    <main className="min-h-screen bg-[#fbf9f4] px-6 py-20 sm:py-28 lg:px-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/oliva"
          className="text-sm font-medium text-[#556B2F] transition-colors hover:text-[#8f4c35]"
        >
          ← Volver a IngeniaFood
        </Link>
        <h1 className="mt-10 font-sans text-3xl font-semibold tracking-tight text-[#1b1c19] sm:text-4xl">
          {title}
        </h1>
        <div className="mt-6 space-y-4 text-base leading-relaxed text-[#53433e]">
          {children}
        </div>
      </div>
    </main>
  );
}
