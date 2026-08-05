"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SwipeToCloseHandleProps = {
  onClose: () => void;
  disabled?: boolean;
  /**
   * Distancia vertical mínima (px) para cerrar.
   * Recomendado: 60-90.
   */
  thresholdPx?: number;
  /**
   * Si true, muestra el tirador “grab” solo como feedback visual.
   */
  showGrabCursor?: boolean;
  className?: string;
};

/**
 * Tirador (handle) para cerrar modales tipo bottom-sheet con swipe hacia abajo.
 * Usamos Pointer Events para soportar móvil/desktop.
 */
export function SwipeToCloseHandle({
  onClose,
  disabled = false,
  thresholdPx = 80,
  showGrabCursor = true,
  className
}: SwipeToCloseHandleProps) {
  const dragStartYRef = useRef<number | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const didSwipeRef = useRef(false);

  const [dragging, setDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);

  const canClose = !disabled;

  const ariaLabel = useMemo(() => "Desliza hacia abajo para cerrar", []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canClose) return;
      dragStartYRef.current = event.clientY;
      dragStartXRef.current = event.clientX;
      didSwipeRef.current = false;
      setDragging(true);
      setTranslateY(0);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canClose]
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!canClose) return;
    if (dragStartYRef.current == null || dragStartXRef.current == null) return;

    const dy = event.clientY - dragStartYRef.current;
    const dx = event.clientX - dragStartXRef.current;

    // Evitamos disparar por movimientos horizontales.
    if (Math.abs(dx) > Math.abs(dy) * 1.2) return;
    if (Math.abs(dy) > 10) didSwipeRef.current = true;

    // Solo nos interesa el swipe hacia abajo.
    if (dy > 0) setTranslateY(Math.min(160, dy));
  }, [canClose]);

  const finishDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!canClose) return;
      if (dragStartYRef.current == null) return;

      const dy = event.clientY - dragStartYRef.current;
      dragStartYRef.current = null;
      dragStartXRef.current = null;

      const shouldClose = didSwipeRef.current && dy > thresholdPx;
      setDragging(false);
      setTranslateY(0);
      if (shouldClose) onClose();
    },
    [canClose, onClose, thresholdPx]
  );

  return (
    <div
      role="button"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(event) => {
        if (!canClose) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClose();
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={() => {
        dragStartYRef.current = null;
        dragStartXRef.current = null;
        setDragging(false);
        setTranslateY(0);
      }}
      className={cn(
        "mx-auto h-1.5 w-12 select-none rounded-full bg-gray-300",
        showGrabCursor ? "touch-none" : null,
        disabled ? "opacity-50" : null,
        dragging
          ? "cursor-grabbing"
          : showGrabCursor
            ? "cursor-grab active:cursor-grabbing"
            : null,
        className
      )}
      style={dragging ? { transform: `translateY(${translateY}px)` } : undefined}
    />
  );
}

