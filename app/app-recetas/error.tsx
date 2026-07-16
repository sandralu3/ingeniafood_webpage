"use client";

import { useEffect } from "react";
import Link from "next/link";
import { APP_ROUTES } from "@/lib/navigation/app-routes";

type AppRecetasErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppRecetasError({ error, reset }: AppRecetasErrorProps) {
  useEffect(() => {
    console.error("[app-recetas] Error de navegación:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
        IngeniaFood
      </p>
      <h1 className="mt-2 font-serif text-xl font-semibold text-stone-900">
        No pudimos cargar esta pantalla
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">
        Hubo un problema al cambiar de sección. Puedes reintentar o volver a Hoy.
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Reintentar
        </button>
        <Link
          href={APP_ROUTES.hoy}
          className="rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
        >
          Ir a Hoy
        </Link>
      </div>
    </div>
  );
}
