import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import {
  BETA_GUIDE_PUBLIC_PATH,
  markdownGuideToHtml
} from "@/lib/marketing/beta-guide";

export const metadata: Metadata = {
  title: "Guía de Pruebas Beta | IngeniaFood",
  description:
    "Guía privada para testers de la beta de IngeniaFood. Solo accesible con el enlace.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  }
};

async function loadGuide() {
  const filePath = path.join(process.cwd(), "docs", "guia-pruebas-beta.md");
  const markdown = await readFile(filePath, "utf8");
  return markdownGuideToHtml(markdown);
}

function TocNav({
  items
}: {
  items: Array<{ id: string; label: string }>;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="rounded-lg px-2.5 py-2 text-[13px] font-medium leading-snug text-stone-600 transition hover:bg-white hover:text-[#8f4c35] active:bg-white"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export default async function BetaTesterGuidePage() {
  const { html, toc } = await loadGuide();
  // Solo secciones principales (### del doc → level 3).
  const sectionToc = toc.filter((item) => item.level === 3);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fdfcfb] text-stone-800">
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
          <Link
            href="/"
            className="inline-flex min-w-0 items-center gap-2 text-sm tracking-[0.03em] hover:opacity-90"
          >
            <svg
              aria-hidden
              className="h-7 w-7 shrink-0 text-[#556B2F]"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11 20A7 7 0 0 1 4 13C4 7.5 8 4 14 4c0 6-3 10-9 10"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M20 4c0 6-4 10-9 10"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span className="truncate">
              <span className="font-light text-[#444444]">Ingenia</span>
              <span className="font-bold text-[#556B2F]">Food</span>
            </span>
          </Link>
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#556B2F]/12 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#556B2F] sm:px-3 sm:text-[10px] sm:tracking-[0.14em]">
            Solo testers
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:py-10">
        {/* Índice móvil: colapsable */}
        <details className="group rounded-2xl border border-[#d9d2c4] bg-[#f5f2ed]/90 shadow-sm lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-[#556B2F] [&::-webkit-details-marker]:hidden">
            <span className="uppercase tracking-[0.14em] text-[10px]">Índice</span>
            <span className="text-xs font-semibold text-stone-500 group-open:hidden">
              Ver secciones
            </span>
            <span className="hidden text-xs font-semibold text-stone-500 group-open:inline">
              Cerrar
            </span>
          </summary>
          <div className="border-t border-[#d9d2c4]/80 px-2 pb-3 pt-1">
            <TocNav items={sectionToc} />
          </div>
        </details>

        {/* Índice desktop */}
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="rounded-2xl border border-[#d9d2c4] bg-[#f5f2ed]/80 p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#556B2F]">
              Índice
            </p>
            <TocNav items={sectionToc} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
            Enlace privado. No lo publiques en redes. Si lo pierdes, pide uno nuevo a
            Sandra.
          </p>
        </aside>

        <article className="min-w-0 max-w-full">
          <div className="mb-4 rounded-2xl border border-[#d9d2c4] bg-gradient-to-br from-[#f5f2ed] to-[#ece8df] p-4 sm:mb-6 sm:rounded-[1.5rem] sm:p-7">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#556B2F]">
              Beta IngeniaFood
            </p>
            <h1 className="font-sans text-xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              Guía de Pruebas para Testers
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-stone-600 sm:text-base">
              Documento claro y orientado a lo que ves en pantalla. Úsalo mientras pruebas
              la app y marca los checks a medida que avances.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a
                href="/descargar-app"
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#8f4c35] px-4 py-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] sm:w-auto sm:py-2.5 sm:hover:-translate-y-0.5 sm:hover:shadow-md"
              >
                Abrir / descargar app
              </a>
              <a
                href="https://ingeniafood.atlassian.net/jira/software/projects/IF/boards/2?filter=&groupBy=none"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#556B2F] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110 active:scale-[0.99] sm:w-auto sm:py-2.5"
              >
                Reportar en Jira
              </a>
              <a
                href="#como-reportar-un-error"
                className="inline-flex w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-700 transition hover:border-[#556B2F]/40 hover:text-[#556B2F] active:scale-[0.99] sm:w-auto sm:py-2.5"
              >
                Cómo reportar un error
              </a>
            </div>
          </div>

          <div
            className="guide-prose max-w-full overflow-x-hidden rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:rounded-[1.5rem] sm:p-8"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <p className="mt-5 break-all px-1 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[10px] text-stone-400 sm:mt-6 sm:text-[11px]">
            Ruta privada · {BETA_GUIDE_PUBLIC_PATH}
          </p>
        </article>
      </main>

      <style>{`
        .guide-prose {
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .guide-prose .guide-h1 {
          display: none;
        }
        .guide-prose .guide-h2 {
          margin: 1.5rem 0 0.75rem;
          scroll-margin-top: 5.5rem;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1c1917;
          line-height: 1.3;
          padding-bottom: 0.35rem;
          border-bottom: 2px solid #e9967a55;
        }
        .guide-prose .guide-h2:first-child {
          margin-top: 0;
        }
        .guide-prose .guide-h3 {
          margin: 1.35rem 0 0.65rem;
          scroll-margin-top: 5.5rem;
          font-size: 1.05rem;
          font-weight: 700;
          color: #1c1917;
          line-height: 1.35;
          padding-bottom: 0.3rem;
          border-bottom: 2px solid #e9967a55;
        }
        .guide-prose .guide-h3:first-child {
          margin-top: 0;
        }
        .guide-prose .guide-h4 {
          margin: 1rem 0 0.4rem;
          scroll-margin-top: 5.5rem;
          font-size: 0.95rem;
          font-weight: 700;
          color: #556B2F;
        }
        .guide-prose .guide-p {
          margin: 0.5rem 0;
          font-size: 0.9rem;
          line-height: 1.6;
          color: #44403c;
        }
        .guide-prose .guide-ul,
        .guide-prose .guide-ol {
          margin: 0.45rem 0 0.75rem;
          padding-left: 1.15rem;
          color: #44403c;
          font-size: 0.9rem;
          line-height: 1.55;
        }
        .guide-prose .guide-ul li,
        .guide-prose .guide-ol li {
          margin: 0.3rem 0;
        }
        .guide-prose .guide-checklist {
          list-style: none;
          margin: 0.6rem 0 0.9rem;
          padding: 0.65rem 0.75rem;
          border-radius: 0.9rem;
          background: #f5f2ed;
          border: 1px solid #d9d2c4;
        }
        .guide-prose .guide-checklist li {
          margin: 0.4rem 0;
        }
        .guide-prose .guide-check-item {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          min-height: 1.75rem;
          font-size: 0.88rem;
          line-height: 1.45;
          color: #44403c;
        }
        .guide-prose .guide-check-item input {
          margin-top: 0.15rem;
          width: 1.05rem;
          height: 1.05rem;
          flex-shrink: 0;
          accent-color: #556B2F;
        }
        .guide-prose .guide-quote {
          margin: 0.75rem 0;
          padding: 0.75rem 0.85rem;
          border-left: 4px solid #556B2F;
          border-radius: 0 0.9rem 0.9rem 0;
          background: #f0f4ed;
          color: #3e5219;
        }
        .guide-prose .guide-quote p {
          margin: 0.2rem 0;
          font-size: 0.86rem;
          line-height: 1.5;
        }
        .guide-prose .guide-hr {
          border: 0;
          border-top: 1px solid #e7e5e4;
          margin: 1.35rem 0;
        }
        .guide-prose .guide-table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 0.75rem 0 1rem;
          max-width: 100%;
          border-radius: 0.9rem;
          border: 1px solid #e7e5e4;
        }
        .guide-prose .guide-table {
          width: 100%;
          min-width: 16rem;
          border-collapse: collapse;
          font-size: 0.82rem;
        }
        .guide-prose .guide-table th,
        .guide-prose .guide-table td {
          padding: 0.55rem 0.65rem;
          text-align: left;
          border-bottom: 1px solid #f5f5f4;
          vertical-align: top;
        }
        .guide-prose .guide-table th {
          background: #f5f2ed;
          color: #556B2F;
          font-weight: 700;
        }
        .guide-prose .guide-pre {
          margin: 0.75rem 0;
          padding: 0.75rem 0.85rem;
          border-radius: 0.9rem;
          background: #1c1917;
          color: #fafaf9;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          max-width: 100%;
          font-size: 0.72rem;
          line-height: 1.5;
        }
        .guide-prose code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.86em;
          background: #f5f2ed;
          color: #8f4c35;
          padding: 0.1rem 0.3rem;
          border-radius: 0.3rem;
        }
        .guide-prose .guide-pre code {
          background: transparent;
          color: inherit;
          padding: 0;
          white-space: pre;
        }
        .guide-prose strong {
          color: #1c1917;
          font-weight: 700;
        }
        .guide-prose .guide-link {
          color: #556B2F;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 2px;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .guide-prose .guide-link:hover {
          color: #8f4c35;
        }
        @media (min-width: 640px) {
          .guide-prose .guide-h2 {
            margin: 2rem 0 0.85rem;
            font-size: 1.25rem;
            scroll-margin-top: 6rem;
          }
          .guide-prose .guide-h3 {
            margin: 1.75rem 0 0.75rem;
            font-size: 1.15rem;
            scroll-margin-top: 6rem;
          }
          .guide-prose .guide-h4 {
            font-size: 1rem;
            scroll-margin-top: 6rem;
          }
          .guide-prose .guide-p,
          .guide-prose .guide-ul,
          .guide-prose .guide-ol {
            font-size: 0.95rem;
            line-height: 1.65;
          }
          .guide-prose .guide-table {
            font-size: 0.9rem;
          }
          .guide-prose .guide-pre {
            font-size: 0.8rem;
          }
          .guide-prose .guide-check-item {
            font-size: 0.92rem;
          }
        }
      `}</style>
    </div>
  );
}
