"use client";

import Link from "next/link";

type TryQrScreenProps = {
  targetUrl: string;
  qrUrl: string;
  backHref?: string;
};

export function TryQrScreen({
  targetUrl,
  qrUrl,
  backHref = "/oliva"
}: TryQrScreenProps) {
  return (
    <section className="flex min-h-screen w-full items-center justify-center bg-[#fbf9f4] px-6 py-12">
      <article className="w-full max-w-md rounded-3xl border border-[#e8e2d6] bg-[#fffcf7] p-8 text-center shadow-[0_24px_48px_-28px_rgba(27,28,25,0.18)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#556B2F]">
          IngeniaFood
        </p>
        <h1 className="mt-3 font-sans text-2xl font-semibold tracking-tight text-[#1b1c19]">
          Ábrela en tu móvil
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#53433e]">
          IngeniaFood está pensada como app en el móvil. Escanea el código,
          instálala en tu pantalla de inicio y después crea tu cuenta.
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt="Código QR para abrir IngeniaFood en el móvil"
          className="mx-auto mt-7 h-56 w-56 rounded-2xl border border-[#e8e2d6] bg-white p-2"
        />

        <p className="mt-4 break-all text-xs text-[#86736d]">{targetUrl}</p>

        <Link
          href={backHref}
          className="mt-7 inline-flex text-sm font-semibold text-[#8f4c35] underline-offset-4 transition hover:underline"
        >
          Volver a IngeniaFood
        </Link>
      </article>
    </section>
  );
}
