"use client";

import { useEffect, useState } from "react";

type Props = {
  retryMessage: string | null;
};

export function RecipeLoadingSkeleton({ retryMessage }: Props) {
  const loadingMessages = [
    "Sandra está preparando tu receta personalizada...",
    "Sandra está eligiendo las mejores técnicas para tus ingredientes...",
    "Sandra está optimizando los tiempos de cocción...",
    "Casi listo... Sandra le está dando el toque final a tu plan saludable."
  ];
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 5000);
    return () => {
      window.clearInterval(interval);
    };
  }, [loadingMessages.length]);

  return (
    <div className="opacity-100 transition-opacity duration-300">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex items-center gap-2 rounded-full bg-sv-secondary-container px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-sv-on-secondary-container">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sv-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sv-primary" />
          </span>
          <span>
            <span className="font-extrabold text-[#556B2F]">Sandra</span> en cocina
          </span>
        </div>
        <h1 className="max-w-2xl text-3xl font-extrabold tracking-tight text-sv-primary md:text-5xl">
          {loadingMessages[messageIndex]}
        </h1>
        {retryMessage ? (
          <p className="max-w-xl text-sm font-medium text-sv-on-surface-variant">
            {retryMessage}
          </p>
        ) : null}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="group relative aspect-[16/9] overflow-hidden rounded-xl bg-sv-surface-low md:col-span-8">
          <div className="animate-skeleton-pulse absolute inset-0 bg-gradient-to-br from-sv-surface-low to-sv-surface-high" />
        </div>
        <div className="flex flex-col justify-between rounded-xl bg-sv-surface-low p-8 md:col-span-4">
          <div className="animate-skeleton-pulse space-y-6">
            <div className="h-4 w-24 rounded-full bg-sv-surface-highest" />
            <div className="space-y-3">
              <div className="h-8 w-full rounded-lg bg-sv-surface-highest" />
              <div className="h-8 w-2/3 rounded-lg bg-sv-surface-highest" />
            </div>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <div className="h-12 w-12 animate-skeleton-pulse rounded-full bg-sv-surface-highest" />
            <div className="flex-grow space-y-2">
              <div className="h-3 w-20 animate-skeleton-pulse rounded-full bg-sv-surface-highest" />
              <div className="h-3 w-32 animate-skeleton-pulse rounded-full bg-sv-surface-highest" />
            </div>
          </div>
        </div>

        <div className="space-y-8 rounded-xl bg-white p-8 shadow-[0_40px_60px_rgba(0,0,0,0.03)] md:col-span-5">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 animate-skeleton-pulse rounded-full bg-sv-surface-high" />
            <div className="h-4 w-16 animate-skeleton-pulse rounded-full bg-sv-surface-low" />
          </div>
          <div className="space-y-4">
            {[0, 0.2, 0.4, 0.6].map((delay) => (
              <div
                key={delay}
                className="flex items-center gap-4 py-3"
                style={{ animationDelay: `${delay}s` }}
              >
                <div className="h-6 w-6 animate-skeleton-pulse rounded-full bg-sv-surface-low" />
                <div className="h-4 flex-grow animate-skeleton-pulse rounded-full bg-sv-surface-low" />
                <div className="h-4 w-12 animate-skeleton-pulse rounded-full bg-sv-surface-low" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8 p-8 md:col-span-7">
          <div className="h-6 w-48 animate-skeleton-pulse rounded-full bg-sv-surface-high" />
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="h-4 w-full animate-skeleton-pulse rounded-full bg-sv-surface-low" />
              <div className="h-4 w-full animate-skeleton-pulse rounded-full bg-sv-surface-low" />
              <div className="h-4 w-2/3 animate-skeleton-pulse rounded-full bg-sv-surface-low" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-full animate-skeleton-pulse rounded-full bg-sv-surface-low" />
              <div className="h-4 w-full animate-skeleton-pulse rounded-full bg-sv-surface-low" />
              <div className="h-4 w-1/2 animate-skeleton-pulse rounded-full bg-sv-surface-low" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
