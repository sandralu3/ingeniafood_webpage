"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  imageUrl: string;
  imageAlt: string;
  /** Contenido del panel inferior (cabecera, lista, CTAs). */
  children: ReactNode;
  /** Overlay opcional encima de la foto (avisos, badges). */
  overlay?: ReactNode;
  className?: string;
  /** Altura relativa del sheet respecto al contenedor. */
  sheetMaxClassName?: string;
};

/**
 * Layout tipo comentarios Instagram: foto redondeada arriba (sobre fondo negro)
 * + bottom sheet blanco debajo que no tapa la imagen.
 */
export function ScanPhotoSheetStage({
  imageUrl,
  imageAlt,
  children,
  overlay,
  className,
  sheetMaxClassName = "max-h-[min(58dvh,28rem)]"
}: Props) {
  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-black",
        className
      )}
    >
      <div className="relative flex min-h-[7.5rem] w-full flex-1 flex-col px-2.5 pb-1.5 pt-2">
        <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-[1.35rem] bg-stone-950 sm:rounded-[1.5rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/20" />
          {overlay}
        </div>
      </div>

      <div
        className={cn(
          "relative z-10 flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.18)]",
          sheetMaxClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
