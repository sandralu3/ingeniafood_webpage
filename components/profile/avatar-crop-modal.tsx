"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Loader2, X } from "lucide-react";
import { getCroppedImageBlob } from "@/lib/images/crop-image";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  imageSrc: string | null;
  isProcessing?: boolean;
  onClose: () => void;
  onConfirm: (croppedBlob: Blob) => void;
};

export function AvatarCropModal({
  open,
  imageSrc,
  isProcessing = false,
  onClose,
  onConfirm
}: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !imageSrc) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setErrorMessage(null);
  }, [imageSrc, open]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels || isProcessing) return;

    setErrorMessage(null);
    try {
      const croppedBlob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      onConfirm(croppedBlob);
    } catch (error) {
      console.error("[avatar-crop] Error recortando imagen:", error);
      setErrorMessage("No pudimos procesar la imagen. Intenta con otra foto.");
    }
  };

  if (!open || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/60 px-0 backdrop-blur-sm sm:items-center sm:px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-crop-title"
        className="flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-stone-200/80 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4d6437]/80">
              Foto de perfil
            </p>
            <h2 id="avatar-crop-title" className="mt-1 text-lg font-semibold text-stone-900">
              Ajusta tu avatar
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Haz zoom y mueve la imagen hasta encuadrarla en el círculo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative h-[min(58dvh,22rem)] w-full bg-stone-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-stone-500">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              disabled={isProcessing}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-[#4d6437] disabled:opacity-50 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#4d6437]"
            />
          </label>

          {errorMessage ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isProcessing || !croppedAreaPixels}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-full bg-[#4d6437] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#556B2F]",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Confirmar Ajuste"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
