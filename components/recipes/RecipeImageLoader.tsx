"use client";

import { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const LOTTIE_SRC = "/lottie/LoadingEscaner.json";
const MESSAGE_ROTATION_MS = 5000;

const MESSAGE_KEYS = [
  "loaderIngredients",
  "loaderCooking",
  "loaderPlating"
] as const;

type Props = {
  className?: string;
};

/**
 * Placeholder Lottie mientras la foto Premium se genera en segundo plano.
 */
export function RecipeImageLoader({ className }: Props) {
  const t = useTranslations("RecipeDetail");
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageVisible, setMessageVisible] = useState(true);

  useEffect(() => {
    let fadeTimeoutId: number | undefined;

    const intervalId = window.setInterval(() => {
      setMessageVisible(false);
      fadeTimeoutId = window.setTimeout(() => {
        setMessageIndex((current) => (current + 1) % MESSAGE_KEYS.length);
        setMessageVisible(true);
      }, 280);
    }, MESSAGE_ROTATION_MS);

    return () => {
      window.clearInterval(intervalId);
      if (fadeTimeoutId !== undefined) {
        window.clearTimeout(fadeTimeoutId);
      }
    };
  }, []);

  const messageKey = MESSAGE_KEYS[messageIndex] ?? MESSAGE_KEYS[0];

  return (
    <div
      className={cn("mx-auto w-full max-w-xs space-y-2", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#556B2F]/10 bg-gradient-to-br from-[#F0F4ED] via-stone-50 to-[#E8EFE3] shadow-sm shadow-stone-200/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(85,107,47,0.12), transparent 45%), radial-gradient(circle at 80% 70%, rgba(201,162,39,0.10), transparent 40%)"
          }}
        />

        <div className="relative flex h-full flex-col items-center justify-center px-3 pb-2 pt-3">
          <div className="flex w-full max-w-[11.5rem] flex-1 items-center justify-center">
            <DotLottieReact
              src={LOTTIE_SRC}
              loop
              autoplay
              className="h-full w-full"
            />
          </div>

          <p
            className={cn(
              "mt-1 min-h-[2.25rem] px-2 text-center text-[11px] font-medium leading-snug text-[#3e5219] transition-all duration-300 ease-out",
              messageVisible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            )}
          >
            {t(messageKey)}
          </p>
        </div>
      </div>
    </div>
  );
}
