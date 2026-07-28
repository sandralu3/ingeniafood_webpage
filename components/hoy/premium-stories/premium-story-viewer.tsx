"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChefHat, Lightbulb, LineChart, X } from "lucide-react";
import type { PremiumStory, PremiumStoryKind } from "@/lib/premium-stories/types";
import { cn } from "@/lib/utils";

const STORY_MS = 5500;

const KIND_GRADIENT: Record<PremiumStoryKind, string> = {
  analysis: "from-[#1a2e14] via-[#2f4a1f] to-[#556B2F]",
  sandra_tip: "from-[#3e5219] via-[#556B2F] to-[#88AB75]",
  viral_dish: "from-[#5c3d12] via-[#8B6914] to-[#C9A227]"
};

const KIND_BADGE: Record<PremiumStoryKind, string> = {
  analysis: "bg-emerald-100 text-emerald-900",
  sandra_tip: "bg-lime-100 text-lime-900",
  viral_dish: "bg-amber-100 text-amber-950"
};

function StoryIcon({ kind }: { kind: PremiumStoryKind }) {
  if (kind === "analysis") return <LineChart className="h-7 w-7" strokeWidth={1.6} />;
  if (kind === "sandra_tip") return <Lightbulb className="h-7 w-7" strokeWidth={1.6} />;
  return <ChefHat className="h-7 w-7" strokeWidth={1.6} />;
}

type PremiumStoryViewerProps = {
  stories: PremiumStory[];
  startIndex: number;
  onClose: () => void;
};

export function PremiumStoryViewer({
  stories,
  startIndex,
  onClose
}: PremiumStoryViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const elapsedRef = useRef(0);
  const indexRef = useRef(index);
  const onCloseRef = useRef(onClose);

  indexRef.current = index;
  onCloseRef.current = onClose;

  const story = stories[index];

  const goNext = useCallback(() => {
    const current = indexRef.current;
    if (current >= stories.length - 1) {
      // Diferir cierre: no llamar setState del padre dentro de un updater/render.
      queueMicrotask(() => onCloseRef.current());
      return;
    }
    setIndex(current + 1);
    setProgress(0);
    elapsedRef.current = 0;
  }, [stories.length]);

  const goPrev = useCallback(() => {
    const current = indexRef.current;
    if (current <= 0) {
      setProgress(0);
      elapsedRef.current = 0;
      return;
    }
    setIndex(current - 1);
    setProgress(0);
    elapsedRef.current = 0;
  }, []);

  useEffect(() => {
    setIndex(startIndex);
    setProgress(0);
    elapsedRef.current = 0;
  }, [startIndex]);

  useEffect(() => {
    if (!story || paused) return;

    let cancelled = false;
    startedAtRef.current = performance.now();

    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = elapsedRef.current + (now - startedAtRef.current);
      const pct = Math.min(100, (elapsed / STORY_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        elapsedRef.current = 0;
        goNext();
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      elapsedRef.current += performance.now() - startedAtRef.current;
    };
  }, [goNext, index, paused, story]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90">
      <div
        className={cn(
          "relative flex h-full w-full max-w-md flex-col bg-gradient-to-b text-white sm:h-[min(92vh,40rem)] sm:rounded-3xl sm:overflow-hidden",
          KIND_GRADIENT[story.kind]
        )}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-3">
          {stories.map((item, i) => (
            <div key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-75 ease-linear"
                style={{
                  width:
                    i < index ? "100%" : i === index ? `${progress}%` : "0%"
                }}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-6 z-30 rounded-full bg-black/25 p-2 text-white backdrop-blur-sm transition hover:bg-black/40"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>

        <button
          type="button"
          className="absolute inset-y-0 left-0 z-10 w-1/3"
          aria-label="Anterior"
          onClick={goPrev}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 z-10 w-1/3"
          aria-label="Siguiente"
          onClick={goNext}
        />

        <div className="relative z-0 flex flex-1 flex-col justify-end px-5 pb-10 pt-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg backdrop-blur-sm">
            <StoryIcon kind={story.kind} />
          </div>

          {story.badge ? (
            <span
              className={cn(
                "mb-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                KIND_BADGE[story.kind]
              )}
            >
              {story.badge}
            </span>
          ) : null}

          <h2 className="text-2xl font-bold leading-tight tracking-tight">
            {story.title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/90">{story.body}</p>

          {story.ctaLabel && story.ctaHref ? (
            <Link
              href={story.ctaHref}
              onClick={onClose}
              className="relative z-20 mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-bold text-stone-900 shadow-lg transition hover:bg-stone-100"
            >
              {story.ctaLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
