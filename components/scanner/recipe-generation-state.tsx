"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const LOADING_HINTS = [
  "Sandra está buscando el mejor tip para ti...",
  "Sandra está eligiendo las mejores técnicas para tus ingredientes...",
  "Sandra está optimizando los tiempos de cocción...",
  "Casi listo... Sandra le da el toque final a tu plan saludable."
] as const;

type LoadingProps = {
  variant: "loading";
  retryMessage?: string | null;
};

type ErrorProps = {
  variant: "error";
  errorMessage: string;
  onRetry: () => void;
  rateLimitSecondsLeft?: number;
};

type Props = LoadingProps | ErrorProps;

function GenerationShell({ children }: { children: ReactNode }) {
  return (
    <section
      className="animate-fade-in rounded-2xl bg-white/90 px-2.5 py-6 shadow-sm shadow-stone-100/30"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">{children}</div>
    </section>
  );
}

function LoadingView({ retryMessage }: { retryMessage?: string | null }) {
  const [hintIndex, setHintIndex] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHintVisible(false);
      window.setTimeout(() => {
        setHintIndex((prev) => (prev + 1) % LOADING_HINTS.length);
        setHintVisible(true);
      }, 280);
    }, 4500);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <GenerationShell>
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3e5219] to-[#6b8a3e] text-white shadow-sm">
          <Sparkles className="h-4 w-4 animate-pulse" strokeWidth={1.75} aria-hidden />
        </span>

        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
            Generando receta
          </p>
          <h1 className="font-serif text-lg font-semibold text-stone-900">
            Diseñando tu receta ideal
          </h1>
          <p
            className={`text-[11px] leading-relaxed text-stone-500 transition-opacity duration-300 ${
              hintVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {LOADING_HINTS[hintIndex]}
          </p>
          {retryMessage ? (
            <p className="text-[10px] font-medium text-stone-400">{retryMessage}</p>
          ) : null}
        </div>
      </div>
    </GenerationShell>
  );
}

function ErrorView({
  errorMessage,
  onRetry,
  rateLimitSecondsLeft = 0
}: {
  errorMessage: string;
  onRetry: () => void;
  rateLimitSecondsLeft?: number;
}) {
  const isRateLimited = rateLimitSecondsLeft > 0;

  return (
    <GenerationShell>
      <div
        role="alert"
        className="w-full max-w-sm rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-3 text-left text-red-800"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500/90">
          No pudimos generar
        </p>
        <p className="mt-1 text-xs leading-relaxed">{errorMessage}</p>
        <button
          type="button"
          onClick={onRetry}
          disabled={isRateLimited}
          className="mt-3 w-full rounded-full bg-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a5f28] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRateLimited
            ? `Intentar de nuevo en ${rateLimitSecondsLeft}s`
            : "Intentar escanear de nuevo"}
        </button>
      </div>
    </GenerationShell>
  );
}

export function RecipeGenerationState(props: Props) {
  if (props.variant === "error") {
    return (
      <ErrorView
        errorMessage={props.errorMessage}
        onRetry={props.onRetry}
        rateLimitSecondsLeft={props.rateLimitSecondsLeft}
      />
    );
  }

  return <LoadingView retryMessage={props.retryMessage} />;
}
