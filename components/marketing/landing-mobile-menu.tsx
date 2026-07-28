"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#app-beta", labelKey: "nav.app" as const },
  { href: "#beneficios", labelKey: "nav.benefits" as const },
  { href: "#preview", labelKey: "nav.guide" as const },
  { href: "#contacto", labelKey: "nav.contact" as const }
];

/**
 * Menú hamburguesa de la landing — React + posición fija (no depende del HTML string).
 */
export function LandingMobileMenu() {
  const t = useTranslations("Marketing");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.classList.add("overflow-hidden");
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("overflow-hidden");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="landing-mobile-menu-root">
      <button
        type="button"
        className={cn("landing-mobile-menu-toggle", open && "is-open")}
        aria-controls="landing-mobile-drawer"
        aria-expanded={open}
        aria-label={open ? t("closeMenu") : t("openMenu")}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
      </button>

      <button
        type="button"
        aria-label={t("closeMenu")}
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        className={cn("landing-mobile-backdrop", open && "is-open")}
        onClick={() => setOpen(false)}
      />

      <aside
        id="landing-mobile-drawer"
        className={cn("landing-mobile-drawer", open && "is-open")}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <p className="text-xs tracking-[0.08em] text-stone-600">
            <span className="font-medium">Sandra Vergara</span>
            <span className="mx-1 text-stone-400">|</span>
            <span className="font-light text-[#444444]">Ingenia</span>
            <span className="font-bold text-[#556B2F]">Food</span>
          </p>
          <button
            type="button"
            aria-label={t("closeMenu")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 text-stone-700"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-5 py-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="py-2.5 text-sm font-medium text-stone-700"
              onClick={() => setOpen(false)}
            >
              {t(link.labelKey)}
            </a>
          ))}
          <a
            href="#preview"
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-[#e9967a] px-5 py-3 text-sm font-bold text-[#682e19]"
            onClick={() => setOpen(false)}
          >
            {t("ctaGuide")}
          </a>
        </nav>
      </aside>
    </div>
  );
}
