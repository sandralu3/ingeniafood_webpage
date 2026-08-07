import { Manrope, Noto_Serif } from "next/font/google";
import type { ReactNode } from "react";
import "@/components/oliva/motion/oliva-motion.css";

/** Same families as the original landing: Manrope (UI) + Noto Serif (available for headlines). */
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-family-headline",
  display: "swap"
});

export default function OlivaLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${manrope.className} ${notoSerif.variable} oliva-landing min-h-screen bg-[#fbf9f4] font-sans antialiased`}
    >
      {children}
    </div>
  );
}
