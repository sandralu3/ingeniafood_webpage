"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./try.css";

type TryQrModalProps = {
  open: boolean;
  qrUrl: string;
  targetUrl: string;
  onClose: () => void;
};

export function TryQrModal({ open, qrUrl, targetUrl, onClose }: TryQrModalProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  if (!open || !qrUrl) return null;

  return createPortal(
    <div
      className="oliva-try-modal-backdrop"
      data-open="true"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="oliva-try-qr-title"
        className="oliva-try-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#556B2F]">
          IngeniaFood
        </p>
        <h2
          id="oliva-try-qr-title"
          className="mt-3 font-sans text-xl font-semibold tracking-tight text-[#1b1c19]"
        >
          Ábrela en tu móvil
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#53433e]">
          Escanea el código, instala IngeniaFood en tu móvil y crea tu cuenta
          desde la app.
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt="Código QR para abrir IngeniaFood en el móvil"
          className="mx-auto mt-6 h-48 w-48 rounded-2xl border border-[#e8e2d6] bg-white p-2"
        />

        <p className="mt-4 break-all text-xs text-[#86736d]">{targetUrl}</p>

        <button
          type="button"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-[#d9d2c4] px-5 py-2.5 text-sm font-semibold text-[#1b1c19] transition-colors hover:border-[#86736d] hover:bg-[#f5f3ee]"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>,
    document.body
  );
}
