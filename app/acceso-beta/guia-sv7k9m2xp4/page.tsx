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

export default async function BetaTesterGuidePage() {
  const { html, toc } = await loadGuide();
  const sectionToc = toc.filter((item) => item.level === 2 || item.level === 3);

  return (
    <div className="min-h-screen bg-[#fdfcfb] text-stone-800">
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#556B2F]/12 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#556B2F]">
            Solo testers
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-[#d9d2c4] bg-[#f5f2ed]/80 p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#556B2F]">
              Índice
            </p>
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
              {sectionToc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-white hover:text-[#8f4c35] lg:w-full"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <p className="mt-3 hidden text-[11px] leading-relaxed text-stone-500 lg:block">
            Enlace privado. No lo publiques en redes. Si lo pierdes, pide uno nuevo a
            Sandra.
          </p>
        </aside>

        <article className="min-w-0">
          <div className="mb-6 rounded-[1.5rem] border border-[#d9d2c4] bg-gradient-to-br from-[#f5f2ed] to-[#ece8df] p-5 sm:p-7">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#556B2F]">
              Beta IngeniaFood
            </p>
            <h1 className="font-sans text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              Guía de Pruebas para Testers
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
              Documento claro y orientado a lo que ves en pantalla. Úsalo mientras pruebas
              la app y marca los checks a medida que avances.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="/descargar-app"
                className="inline-flex items-center justify-center rounded-xl bg-[#8f4c35] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Abrir / descargar app
              </a>
              <a
                href="https://ingeniafood.atlassian.net/jira/software/projects/IF/boards/2?filter=&groupBy=none"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-[#556B2F] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
              >
                Reportar en Jira
              </a>
              <a
                href="#como-reportar-un-error"
                className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:border-[#556B2F]/40 hover:text-[#556B2F]"
              >
                Cómo reportar un error
              </a>
            </div>
          </div>

          <div
            className="guide-prose rounded-[1.5rem] border border-stone-200/80 bg-white p-5 shadow-sm sm:p-8"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <p className="mt-6 text-center text-[11px] text-stone-400">
            Ruta privada · {BETA_GUIDE_PUBLIC_PATH}
          </p>
        </article>
      </main>

      <style>{`
        .guide-prose .guide-h1 {
          display: none;
        }
        .guide-prose .guide-h2 {
          margin: 2rem 0 0.85rem;
          scroll-margin-top: 6rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1c1917;
          line-height: 1.3;
          padding-bottom: 0.4rem;
          border-bottom: 2px solid #e9967a55;
        }
        .guide-prose .guide-h2:first-child {
          margin-top: 0;
        }
        .guide-prose .guide-h3 {
          margin: 1.75rem 0 0.75rem;
          scroll-margin-top: 6rem;
          font-size: 1.2rem;
          font-weight: 700;
          color: #1c1917;
          line-height: 1.3;
          padding-bottom: 0.35rem;
          border-bottom: 2px solid #e9967a55;
        }
        .guide-prose .guide-h3:first-child {
          margin-top: 0;
        }
        .guide-prose .guide-h4 {
          margin: 1.15rem 0 0.45rem;
          font-size: 1rem;
          font-weight: 700;
          color: #556B2F;
        }
        .guide-prose .guide-p {
          margin: 0.55rem 0;
          font-size: 0.95rem;
          line-height: 1.65;
          color: #44403c;
        }
        .guide-prose .guide-ul,
        .guide-prose .guide-ol {
          margin: 0.5rem 0 0.85rem;
          padding-left: 1.2rem;
          color: #44403c;
          font-size: 0.95rem;
          line-height: 1.6;
        }
        .guide-prose .guide-ul li,
        .guide-prose .guide-ol li {
          margin: 0.28rem 0;
        }
        .guide-prose .guide-checklist {
          list-style: none;
          margin: 0.65rem 0 1rem;
          padding: 0.75rem 0.9rem;
          border-radius: 1rem;
          background: #f5f2ed;
          border: 1px solid #d9d2c4;
        }
        .guide-prose .guide-checklist li {
          margin: 0.35rem 0;
        }
        .guide-prose .guide-check-item {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          font-size: 0.92rem;
          line-height: 1.45;
          color: #44403c;
        }
        .guide-prose .guide-check-item input {
          margin-top: 0.2rem;
          accent-color: #556B2F;
        }
        .guide-prose .guide-quote {
          margin: 0.85rem 0;
          padding: 0.85rem 1rem;
          border-left: 4px solid #556B2F;
          border-radius: 0 1rem 1rem 0;
          background: #f0f4ed;
          color: #3e5219;
        }
        .guide-prose .guide-quote p {
          margin: 0.2rem 0;
          font-size: 0.9rem;
          line-height: 1.55;
        }
        .guide-prose .guide-hr {
          border: 0;
          border-top: 1px solid #e7e5e4;
          margin: 1.75rem 0;
        }
        .guide-prose .guide-table-wrap {
          overflow-x: auto;
          margin: 0.85rem 0 1.1rem;
          border-radius: 1rem;
          border: 1px solid #e7e5e4;
        }
        .guide-prose .guide-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .guide-prose .guide-table th,
        .guide-prose .guide-table td {
          padding: 0.65rem 0.85rem;
          text-align: left;
          border-bottom: 1px solid #f5f5f4;
        }
        .guide-prose .guide-table th {
          background: #f5f2ed;
          color: #556B2F;
          font-weight: 700;
        }
        .guide-prose .guide-pre {
          margin: 0.85rem 0;
          padding: 0.9rem 1rem;
          border-radius: 1rem;
          background: #1c1917;
          color: #fafaf9;
          overflow-x: auto;
          font-size: 0.8rem;
          line-height: 1.5;
        }
        .guide-prose code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.86em;
          background: #f5f2ed;
          color: #8f4c35;
          padding: 0.1rem 0.35rem;
          border-radius: 0.35rem;
        }
        .guide-prose .guide-pre code {
          background: transparent;
          color: inherit;
          padding: 0;
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
        }
        .guide-prose .guide-link:hover {
          color: #8f4c35;
        }
      `}</style>
    </div>
  );
}
