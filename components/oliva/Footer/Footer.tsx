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
    <footer className="oliva-footer">
      <div className="oliva-footer-inner mx-auto w-full max-w-6xl px-6 lg:px-10">
        <div className="oliva-footer-top">
          <div className="oliva-footer-brand">
            <a href="/oliva" className="oliva-footer-logo inline-block">
              <span className="text-base tracking-[0.04em]">
                <span className="font-light text-[#444444]">Ingenia</span>
                <span className="font-bold text-[#556B2F]">Food</span>
              </span>
            </a>
            <p className="oliva-footer-tagline">
              Cocinar mejor empieza con una mejor decisión.
            </p>
          </div>

          <nav className="oliva-footer-nav" aria-label="Enlaces del pie">
            <div className="oliva-footer-col">
              <p className="oliva-footer-heading">Producto</p>
              <ul>
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="oliva-footer-link">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="oliva-footer-col">
              <p className="oliva-footer-heading">Legal</p>
              <ul>
                {LEGAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="oliva-footer-link">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <p className="oliva-footer-copy">
          © {new Date().getFullYear()} IngeniaFood
        </p>
      </div>
    </footer>
  );
}
