"use client";

import type { CSSProperties } from "react";
import { TryCta } from "@/components/oliva/try";
import { OLIVA_SECTIONS } from "./sections";

type SectionNavProps = {
  open: boolean;
  activeSection: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
};

export function SectionNav({
  open,
  activeSection,
  onClose,
  onNavigate
}: SectionNavProps) {
  return (
    <div
      className="oliva-nav-stage"
      data-open={open ? "true" : "false"}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="oliva-nav-backdrop"
        aria-label="Cerrar menú"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />

      <nav
        id="oliva-section-nav"
        className="oliva-nav-canvas"
        aria-label="Navegación por secciones"
      >
        <div className="oliva-nav-canvas-glow" aria-hidden="true" />

        <div className="oliva-nav-canvas-inner">
          <header className="oliva-nav-top">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#556B2F]">
                Explorar
              </p>
              <p className="mt-1 text-sm text-[#86736d]">
                Elige dónde quieres ir
              </p>
            </div>
          </header>

          <ul className="oliva-nav-list">
            {OLIVA_SECTIONS.map((section, index) => (
              <li
                key={section.id}
                className="oliva-nav-item"
                style={{ "--nav-i": index } as CSSProperties}
              >
                <button
                  type="button"
                  className="oliva-nav-link group w-full text-left"
                  data-active={activeSection === section.id ? "true" : "false"}
                  onClick={() => onNavigate(section.id)}
                >
                  <span className="oliva-nav-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="oliva-nav-copy">
                    <span className="oliva-nav-label">{section.label}</span>
                    <span className="oliva-nav-hint">{section.hint}</span>
                  </span>
                  <span className="oliva-nav-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <footer className="oliva-nav-footer">
            <TryCta
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              onBeforeAction={onClose}
            >
              Probar IngeniaFood gratis
            </TryCta>
            <p className="mt-3 text-center text-xs text-[#86736d] sm:text-left">
              24 h Premium cuando tú quieras
            </p>
          </footer>
        </div>
      </nav>
    </div>
  );
}
