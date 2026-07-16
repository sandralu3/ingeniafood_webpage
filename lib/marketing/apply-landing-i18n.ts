/**
 * Sustituye textos de marketing en el HTML monolítico de la landing
 * y prepara el slot del selector de idioma (#marketing-lang-root).
 */

export type MarketingCopy = {
  navApp: string;
  navBenefits: string;
  navGuide: string;
  navContact: string;
  ctaGuide: string;
  openMenu: string;
  closeMenu: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaGuide: string;
  heroCtaSocial: string;
  heroImageAlt: string;
  appBadge: string;
  appTitle: string;
  appSubtitle: string;
  appCardTitle: string;
  appCardBody: string;
  socialTitle: string;
  socialSubtitle: string;
  instagramReelTitle: string;
  socialCta: string;
  socialNote: string;
  benefitsTitle: string;
  benefit1Title: string;
  benefit1Body: string;
  benefit2Title: string;
  benefit2Body: string;
  benefit3Title: string;
  benefit3Body: string;
  guideTitlePrefix: string;
  guideTitleAccent: string;
  guideSubtitle: string;
  guideBullet1: string;
  guideBullet2: string;
  guideBullet3: string;
  guideFreeBadge: string;
  guideMeta: string;
  guideDownload: string;
  guideImageAlt: string;
  guideBadgePdf: string;
  guideBadgeFast: string;
  contactEyebrow: string;
  contactTitle: string;
  contactSubtitle: string;
  contactCta: string;
  footerRights: string;
  footerPrivacy: string;
  footerTerms: string;
  footerContact: string;
  logoAlt: string;
};

const LOGO_SVG =
  '<svg aria-hidden="true" class="w-7 h-7 sm:w-8 sm:h-8 text-[#556B2F] shrink-0" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">\n<path d="M11 20A7 7 0 0 1 4 13C4 7.5 8 4 14 4c0 6-3 10-9 10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>\n<path d="M20 4c0 6-4 10-9 10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>\n</svg>';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAllLiteral(haystack: string, search: string, replacement: string) {
  return haystack.split(search).join(replacement);
}

export function applyLandingI18n(rawHtml: string, copy: MarketingCopy): string {
  let html = rawHtml;

  // CTA principal: apunta a la guía (no a /descargar-app).
  html = replaceAllLiteral(
    html,
    'href="/descargar-app">Descargar App</a>',
    `href="#preview">${copy.heroCtaGuide}</a>`
  );

  html = replaceAllLiteral(
    html,
    LOGO_SVG,
    `<img alt="${copy.logoAlt}" class="h-7 w-auto sm:h-8 shrink-0 object-contain" loading="lazy" src="/icons/icon-96.png"/>`
  );

  // Slot del selector de idioma junto al CTA / menú móvil.
  html = html.replace(
    /<div class="hidden md:flex items-center gap-4">\s*<a class="inline-flex items-center justify-center bg-\[#e9967a\][\s\S]*?<\/a>\s*<\/div>\s*<button aria-controls="mobile-drawer"/,
    `<div class="flex items-center gap-2 sm:gap-3 shrink-0">
<div id="marketing-lang-root" class="relative z-[1]"></div>
<div class="hidden md:flex items-center gap-4">
<a class="inline-flex items-center justify-center bg-[#e9967a] text-[#682e19] px-5 py-2 rounded-lg font-bold text-sm hover:scale-95 transition-transform duration-200 ease-in-out text-center" href="#preview">${copy.ctaGuide}</a>
</div>
<button aria-controls="mobile-drawer"`
  );

  // Cierra el wrapper flex añadido (antes de cerrar #site-nav-inner).
  html = html.replace(
    /(<button aria-controls="mobile-drawer"[\s\S]*?<\/button>)\s*<\/div>\s*<\/nav>/,
    `$1\n</div>\n</div>\n</nav>`
  );

  const pairs: Array<[string, string]> = [
    [">Beneficios<", `>${copy.navBenefits}<`],
    [">Guía gratis<", `>${copy.navGuide}<`],
    [">Contacto<", `>${copy.navContact}<`],
    [">Obtener Guía<", `>${copy.ctaGuide}<`],
    ['aria-label="Abrir menú de navegación"', `aria-label="${copy.openMenu}"`],
    ['aria-label="Cerrar menú de navegación"', `aria-label="${copy.closeMenu}"`],
    [">Equilibrio Real<", `>${copy.heroBadge}<`],
    [">Tu despensa optimizada con ingeniería<", `>${copy.heroTitle}<`],
    [
      ">Estamos desarrollando IngeniaFood, la tecnología que escanea tus ingredientes y diseña la receta perfecta para tu salud y tu tiempo. Muy pronto disponible en versión Beta.<",
      `>${copy.heroSubtitle}<`
    ],
    [">Ver progreso en Redes<", `>${copy.heroCtaSocial}<`],
    ['alt="Pancakes saludables optimizados por IngeniaFood"', `alt="${copy.heroImageAlt}"`],
    [">Próximamente: Versión Beta<", `>${copy.appBadge}<`],
    [">La Ingeniería de tu Nutrición<", `>${copy.appTitle}<`],
    [
      ">IngeniaFood escanea tus ingredientes y utiliza algoritmos para darte la receta perfecta con medidas exactas. Estamos en desarrollo para ofrecerte la mejor experiencia culinaria.<",
      `>${copy.appSubtitle}<`
    ],
    [">Tecnología culinaria inteligente<", `>${copy.appCardTitle}<`],
    [
      ">Un motor nutricional en tiempo real cruza ingredientes, tiempos y porciones para ayudarte a decidir mejor en segundos.<",
      `>${copy.appCardBody}<`
    ],
    [">Mira el progreso en acción<", `>${copy.socialTitle}<`],
    [
      ">Contenido real de nuestras redes para que veas cómo convertimos ingredientes cotidianos en resultados concretos.<",
      `>${copy.socialSubtitle}<`
    ],
    ['title="Reel de Instagram de IngeniaFood"', `title="${copy.instagramReelTitle}"`],
    [">Sigueme para el lanzamiento de la Beta<", `>${copy.socialCta}<`],
    [
      ">No habra registros por mail. El acceso a la version Beta se liberara exclusivamente para mis seguidores en redes sociales el dia del lanzamiento. No te lo pierdas.<",
      `>${copy.socialNote}<`
    ],
    [">¿Qué hace a esta guía única?<", `>${copy.benefitsTitle}<`],
    [">Menos de 15 min<", `>${copy.benefit1Title}<`],
    [
      ">Recetas diseñadas para el cronómetro. Del fuego a la mesa en lo que tarda en hervir el agua.<",
      `>${copy.benefit1Body}<`
    ],
    [">Ingredientes Básicos<", `>${copy.benefit2Title}<`],
    [
      ">Sin ir a tiendas especializadas. Usamos lo que ya tienes en tu nevera y despensa estándar.<",
      `>${copy.benefit2Body}<`
    ],
    [">Cero Complicaciones<", `>${copy.benefit3Title}<`],
    [
      ">Sin técnicas de alta cocina. Pasos directos, claros y sin ensuciar toda la cocina.<",
      `>${copy.benefit3Body}<`
    ],
    [
      ">Descarga GRATIS: <span class=\"text-[#e9967a]\">10 Cenas Rápidas y Sin Harinas</span><",
      `>${copy.guideTitlePrefix} <span class="text-[#e9967a]">${copy.guideTitleAccent}</span><`
    ],
    [
      ">He seleccionado mis 10 recetas favoritas para cerrar el día de forma ligera. Son cenas optimizadas por IngeniaFood para prepararse en tiempo récord, usando ingredientes reales y 100% libres de harinas refinadas.<",
      `>${copy.guideSubtitle}<`
    ],
    [
      ">Recetas diseñadas para hacerse en menos de 15 minutos.<",
      `>${copy.guideBullet1}<`
    ],
    [
      ">Ingredientes sencillos que ya tienes en tu despensa.<",
      `>${copy.guideBullet2}<`
    ],
    [
      ">Cenas saciantes que no te hacen sentir pesada.<",
      `>${copy.guideBullet3}<`
    ],
    [">100% gratis<", `>${copy.guideFreeBadge}<`],
    [">10 Recetas rápidas · IngeniaFood<", `>${copy.guideMeta}<`],
    [
      "Descargar mis 10 Cenas Sin Harinas (PDF)</a>",
      `${copy.guideDownload}</a>`
    ],
    [
      'alt="Wrap sin harinas con huevo, aguacate y rúcula"',
      `alt="${copy.guideImageAlt}"`
    ],
    [">Súper Rápidas<", `>${copy.guideBadgeFast}<`],
    [
      ">Conecta con IngeniaFood<",
      `>${copy.contactTitle}<`
    ],
    [
      ">Síguenos en redes para avances del lanzamiento, recetas optimizadas y acceso anticipado a la beta de la app.<",
      `>${copy.contactSubtitle}<`
    ],
    [
      ">Quiero ser Beta Tester en mis Redes<",
      `>${copy.contactCta}<`
    ],
    [
      ">© 2026 IngeniaFood por Sandra Vergara. Todos los derechos reservados.<",
      `>${copy.footerRights}<`
    ],
    [">Privacidad<", `>${copy.footerPrivacy}<`],
    [">Términos<", `>${copy.footerTerms}<`]
  ];

  // Contacto aparece en nav, drawer, sección y footer: reemplazo genérico controlado.
  for (const [from, to] of pairs) {
    html = replaceAllLiteral(html, from, to);
  }

  // Nav "App" — solo enlaces de navegación (evita tocar otras apariciones de "App").
  html = html.replace(
    new RegExp(`(href="#app-beta")>(${escapeRegExp("App")})<`, "g"),
    `$1>${copy.navApp}<`
  );

  // Eyebrow "Contacto" de la sección (tras reemplazos previos de nav/footer).
  html = replaceAllLiteral(
    html,
    `text-[#556B2F] font-bold text-xs uppercase tracking-[0.16em] mb-4">${copy.navContact}<`,
    `text-[#556B2F] font-bold text-xs uppercase tracking-[0.16em] mb-4">${copy.contactEyebrow}<`
  );

  // PDF badge label stays "PDF" universally; only "Súper Rápidas" translated above.

  return html;
}
