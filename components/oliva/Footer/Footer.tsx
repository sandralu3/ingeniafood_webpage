import "./footer.css";

const PRODUCT_LINKS = [
  { href: "/oliva#proceso", label: "Cómo funciona" },
  { href: "/oliva#faq", label: "Preguntas frecuentes" },
  { href: "/oliva/contacto", label: "Contacto" }
] as const;

const LEGAL_LINKS = [
  { href: "/oliva/privacidad", label: "Privacidad" },
  { href: "/oliva/terminos", label: "Términos" },
  { href: "/oliva/cookies", label: "Cookies" }
] as const;

export function Footer() {
  return (
    <footer className="oliva-snap-section border-t border-[#e8e2d6]/80 bg-[#fbf9f4]">
      <div className="oliva-snap-inner">
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <div className="grid gap-14 text-center sm:gap-16 md:grid-cols-3 md:gap-10 md:text-left">
            <div className="flex flex-col items-center md:items-start">
              <a href="/oliva" className="oliva-footer-logo inline-block">
                <span className="text-base tracking-[0.04em] lg:text-lg">
                  <span className="font-light text-[#444444]">Ingenia</span>
                  <span className="font-bold text-[#556B2F]">Food</span>
                </span>
              </a>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#53433e]">
                Cocinar mejor empieza con una mejor decisión.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#556B2F]">
                Producto
              </p>
              <ul className="mt-5 space-y-3.5">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="oliva-footer-link text-sm">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#556B2F]">
                Legal
              </p>
              <ul className="mt-5 space-y-3.5">
                {LEGAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="oliva-footer-link text-sm">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-16 text-center text-xs text-[#86736d] sm:mt-20">
            © {new Date().getFullYear()} IngeniaFood
          </p>
        </div>
      </div>
    </footer>
  );
}
