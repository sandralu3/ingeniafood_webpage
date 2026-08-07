"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionNav } from "./SectionNav";
import { OLIVA_SECTIONS } from "./sections";
import "./header.css";

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {open ? (
        <path
          d="M5 5l10 10M15 5L5 15"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M3.5 6h13M3.5 10h13M3.5 14h13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 4.5L4.5 9.25V16h4.25v-3.5h2.5V16H15.5V9.25L10 4.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OlivaHeader() {
  const [isOnHero, setIsOnHero] = useState(true);
  const [activeSection, setActiveSection] = useState("inicio");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("inicio");
    if (!hero) return;

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        setIsOnHero(entry.isIntersecting && entry.intersectionRatio > 0.35);
      },
      { threshold: [0, 0.35, 0.6], rootMargin: "-72px 0px 0px 0px" }
    );

    heroObserver.observe(hero);
    return () => heroObserver.disconnect();
  }, []);

  useEffect(() => {
    const sections = OLIVA_SECTIONS.map((s) =>
      document.getElementById(s.id)
    ).filter(Boolean) as HTMLElement[];

    if (sections.length === 0) return;

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: "-20% 0px -55% 0px" }
    );

    sections.forEach((section) => sectionObserver.observe(section));
    return () => sectionObserver.disconnect();
  }, []);

  useEffect(() => {
    const root = document.querySelector(".oliva-landing");

    if (menuOpen) {
      document.body.style.overflow = "hidden";
      root?.classList.add("oliva-nav-open");
    } else {
      document.body.style.overflow = "";
      root?.classList.remove("oliva-nav-open");
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      root?.classList.remove("oliva-nav-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const navigateTo = useCallback((id: string) => {
    const wasOpen = menuOpen;
    setMenuOpen(false);

    window.setTimeout(
      () => {
        const target = document.getElementById(id);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      wasOpen ? 280 : 0
    );
  }, [menuOpen]);

  return (
    <>
      <header
        className={`oliva-header ${isOnHero ? "oliva-header--hero" : "oliva-header--scrolled"}`}
      >
        <div
          className={`oliva-header-bar mx-auto flex max-w-6xl items-center justify-between ${
            isOnHero ? "px-6 py-5 lg:px-10 lg:py-6" : ""
          }`}
        >
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              navigateTo("inicio");
            }}
            className={`tracking-[0.04em] text-[#1b1c19] transition-opacity hover:opacity-80 ${
              isOnHero
                ? "text-base lg:text-lg"
                : "oliva-header-logo--compact shrink-0"
            }`}
          >
            <span className="font-light text-[#444444]">Ingenia</span>
            <span className="font-bold text-[#556B2F]">Food</span>
          </a>

          <div className="relative flex items-center gap-1">
            {!isOnHero && (
              <button
                type="button"
                className="oliva-header-menu-btn oliva-header-menu-btn--icon oliva-header-home-btn"
                aria-label="Ir al inicio"
                onClick={() => navigateTo("inicio")}
              >
                <HomeIcon />
              </button>
            )}
            <button
              type="button"
              className={`oliva-header-menu-btn oliva-header-menu-btn--icon ${
                isOnHero ? "oliva-header-menu-btn--hero" : ""
              }`}
              data-open={menuOpen ? "true" : "false"}
              aria-expanded={menuOpen}
              aria-controls="oliva-section-nav"
              aria-label={
                menuOpen
                  ? "Cerrar menú de secciones"
                  : "Abrir menú de secciones"
              }
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </header>

      <SectionNav
        open={menuOpen}
        activeSection={activeSection}
        onClose={() => setMenuOpen(false)}
        onNavigate={navigateTo}
      />
    </>
  );
}
