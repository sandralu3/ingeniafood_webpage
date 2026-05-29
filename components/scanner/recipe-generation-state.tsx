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
    <div
      className="flex h-[calc(100dvh-120px)] flex-col items-center justify-center overflow-hidden p-6 text-center"
      aria-live="polite"
    >
      {children}
    </div>
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
      <div className="flex max-w-sm flex-col items-center gap-5 animate-fade-in">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#4c6633]/15" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#4c6633]/20 bg-[#4c6633]/5">
            <Sparkles
              className="h-7 w-7 animate-pulse text-[#4c6633]"
              strokeWidth={1.5}
              aria-hidden
            />
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-xl font-semibold tracking-tight text-stone-800 sm:text-2xl">
            Diseñando tu receta ideal
          </h1>
          <p
            className={`text-sm text-stone-500 transition-opacity duration-300 ${
              hintVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {LOADING_HINTS[hintIndex]}
          </p>
          {retryMessage ? (
            <p className="text-xs font-medium text-stone-400">{retryMessage}</p>
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
        className="w-full max-w-sm animate-fade-in rounded-2xl border border-red-100 bg-red-50 p-4 text-red-800"
      >
        <p className="text-sm leading-relaxed">{errorMessage}</p>
        <button
          type="button"
          onClick={onRetry}
          disabled={isRateLimited}
          className="mt-3 rounded-full bg-[#4c6633] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
