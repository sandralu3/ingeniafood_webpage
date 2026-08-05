"use client";

import { cn } from "@/lib/utils";

type Props = {
  title: string;
  titleId?: string;
  takePhotoLabel?: string;
  galleryLabel?: string;
  cancelLabel?: string;
  /** Si hay foto previa (cambiar foto), muestra Cancelar. */
  showCancel?: boolean;
  disabled?: boolean;
  onTakePhoto: () => void;
  onChooseGallery: () => void;
  onCancel?: () => void;
  className?: string;
};

/**
 * Selector cámara / galería unificado (escáner, snack y comida fuera).
 * Compacto: poco padding y botones bajos, mismo look en todos los módulos.
 */
export function PhotoSourcePicker({
  title,
  titleId,
  takePhotoLabel = "Tomar Foto",
  galleryLabel = "Elegir de la Galería",
  cancelLabel = "Cancelar",
  showCancel = false,
  disabled = false,
  onTakePhoto,
  onChooseGallery,
  onCancel,
  className
}: Props) {
  return (
    <div className={cn("rounded-2xl border border-stone-100 bg-white p-2", className)}>
      <p
        id={titleId}
        className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-stone-400"
      >
        {title}
      </p>
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={onTakePhoto}
          disabled={disabled}
          className="flex w-full items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 text-left text-[13px] font-semibold text-stone-800 transition hover:border-[#3E5A3A]/30 hover:bg-[#F4F7F2] disabled:opacity-60"
        >
          <span className="text-base leading-none" aria-hidden>
            📸
          </span>
          {takePhotoLabel}
        </button>
        <button
          type="button"
          onClick={onChooseGallery}
          disabled={disabled}
          className="flex w-full items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 text-left text-[13px] font-semibold text-stone-800 transition hover:border-[#3E5A3A]/30 hover:bg-[#F4F7F2] disabled:opacity-60"
        >
          <span className="text-base leading-none" aria-hidden>
            🖼️
          </span>
          {galleryLabel}
        </button>
      </div>
      {showCancel && onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="mt-1.5 w-full rounded-xl py-2 text-[13px] font-semibold text-stone-500 transition hover:bg-stone-50 hover:text-stone-700 disabled:opacity-60"
        >
          {cancelLabel}
        </button>
      ) : null}
    </div>
  );
}
