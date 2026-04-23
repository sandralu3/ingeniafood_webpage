import Link from "next/link";
import { QrCode } from "lucide-react";
import { headers } from "next/headers";

async function resolveAppUrl() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";

  if (!host) {
    return "https://ingeniafood.com/app-recetas";
  }

  return `${protocol}://${host}/app-recetas`;
}

export default async function DesktopBlockedPage() {
  const appUrl = await resolveAppUrl();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(appUrl)}`;

  return (
    <section className="h-screen w-full bg-[#fdfcfb] text-sv-on-surface">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col items-center px-6 py-8">
        <div className="pt-2 text-center">
          <p className="text-xs tracking-[0.1em] text-stone-500">
            <span className="font-medium text-stone-700">Sandra Vergara</span>
            <span className="mx-2 text-stone-400">|</span>
            <span className="font-light text-[#444444]">Ingenia</span>
            <span className="font-bold text-[#556B2F]">Food</span>
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <article className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-7 text-center shadow-[0_24px_48px_-28px_rgba(27,28,25,0.22)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#556B2F]/10">
              <QrCode className="h-6 w-6 text-[#556B2F]" />
            </div>
            <h1 className="text-xl font-bold text-stone-900">Optimizado para móviles</h1>
            <p className="mt-2 text-sm text-stone-600">Escanea el QR para entrar</p>
            <img
              src={qrUrl}
              alt="Código QR para abrir App Recetas"
              className="mx-auto mt-6 h-60 w-60 rounded-2xl border border-stone-200 bg-white p-2"
            />
            <Link
              href="/"
              className="mt-6 inline-flex text-sm font-semibold text-[#8f4c35] underline-offset-4 transition hover:underline"
            >
              Volver a la web principal
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
