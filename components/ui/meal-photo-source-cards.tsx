"use client";

import { Camera, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MealPhotoSourceCardsProps = {
  disabled?: boolean;
  showCancel?: boolean;
  takePhotoLabel: string;
  galleryLabel: string;
  takePhotoHint: string;
  galleryHint: string;
  sectionLabel: string;
  cancelLabel: string;
  onTakePhoto: () => void;
  onChooseGallery: () => void;
  onCancel?: () => void;
};

export function MealPhotoSourceCards({
  disabled,
  showCancel,
  takePhotoLabel,
  galleryLabel,
  takePhotoHint,
  galleryHint,
  sectionLabel,
  cancelLabel,
  onTakePhoto,
  onChooseGallery,
  onCancel
}: MealPhotoSourceCardsProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-stone-200/80 bg-[#FAF8F5] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-300/70" />
        <p className="shrink-0 text-center text-[9px] font-bold uppercase tracking-[0.12em] text-stone-500">
          {sectionLabel}
        </p>
        <div className="h-px flex-1 bg-stone-300/70" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onTakePhoto}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-xl border border-sky-100 bg-sky-50/70 px-1.5 py-2.5 text-center transition",
            "hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <Camera className="h-5 w-5 text-sky-700" strokeWidth={1.75} />
          <span className="text-[11px] font-semibold leading-snug text-sky-900">{takePhotoLabel}</span>
          <span className="text-[9px] leading-snug text-sky-800/80">{takePhotoHint}</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onChooseGallery}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-xl border border-emerald-100 bg-emerald-50/70 px-1.5 py-2.5 text-center transition",
            "hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <ImageIcon className="h-5 w-5 text-emerald-700" strokeWidth={1.75} />
          <span className="text-[11px] font-semibold leading-snug text-emerald-900">{galleryLabel}</span>
          <span className="text-[9px] leading-snug text-emerald-800/80">{galleryHint}</span>
        </button>
      </div>

      {showCancel && onCancel ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      ) : null}
    </div>
  );
}
