"use client";

import { useEffect, useMemo } from "react";
import Script from "next/script";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type WindowWithDeferredPrompt = Window & {
  __ingeniaDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
};

const LANDING_HTML = "<!-- TopNavBar -->\n<nav class=\"fixed top-0 w-full z-50 bg-white/70 shadow-sm backdrop-blur-md transition-all duration-300\" id=\"site-nav\">\n<div class=\"flex justify-between items-center max-w-7xl mx-auto px-4 sm:px-6 h-20 md:h-20 gap-3 transition-all duration-300\" id=\"site-nav-inner\">\n<a class=\"flex items-center gap-2 sm:gap-3 shrink min-w-0 hover:opacity-90 transition-opacity\" href=\"#inicio\">\n<svg aria-hidden=\"true\" class=\"w-7 h-7 sm:w-8 sm:h-8 text-[#556B2F] shrink-0\" fill=\"none\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\">\n<path d=\"M11 20A7 7 0 0 1 4 13C4 7.5 8 4 14 4c0 6-3 10-9 10\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"></path>\n<path d=\"M20 4c0 6-4 10-9 10\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"></path>\n</svg>\n<span class=\"block text-sm sm:text-base md:text-lg tracking-[0.03em] whitespace-nowrap leading-none\">\n<span class=\"sm:hidden\"><span class=\"font-light text-[#444444]\">Ingenia</span><span class=\"font-bold text-[#556B2F]\">Food</span></span>\n<span class=\"hidden sm:inline\"><span class=\"font-light text-[#78716c]\">Sandra Vergara</span><span class=\"font-light text-[#a8a29e] mx-1.5\">|</span><span class=\"font-light text-[#444444]\">Ingenia</span><span class=\"font-bold text-[#556B2F]\">Food</span></span>\n</span>\n</a>\n<div class=\"hidden md:flex items-center space-x-8\" id=\"main-nav\">\n<a class=\"nav-spy text-stone-600 hover:text-[#8f4c35] font-medium text-sm\" data-spy=\"app\" href=\"#app-beta\">App</a>\n<a class=\"nav-spy text-stone-600 hover:text-[#8f4c35] font-medium text-sm\" data-spy=\"beneficios\" href=\"#beneficios\">Beneficios</a>\n<a class=\"nav-spy text-stone-600 hover:text-[#8f4c35] font-medium text-sm\" data-spy=\"preview\" href=\"#preview\">Guía gratis</a>\n<a class=\"nav-spy text-stone-600 hover:text-[#8f4c35] font-medium text-sm\" data-spy=\"contacto\" href=\"#contacto\">Contacto</a>\n</div>\n<div class=\"hidden md:flex items-center gap-4\">\n<a class=\"inline-flex items-center justify-center bg-[#e9967a] text-[#682e19] px-5 py-2 rounded-lg font-bold text-sm hover:scale-95 transition-transform duration-200 ease-in-out text-center\" href=\"#preview\">Obtener Guía</a>\n</div>\n<button aria-controls=\"mobile-drawer\" aria-expanded=\"false\" aria-label=\"Abrir menú de navegación\" class=\"md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-stone-300 text-stone-700 hover:text-[#556B2F] hover:border-[#556B2F]/50 transition-colors shrink-0\" id=\"mobile-menu-toggle\" type=\"button\">\n<span class=\"material-symbols-outlined\">menu</span>\n</button>\n</div>\n</nav>\n<div aria-hidden=\"true\" class=\"fixed inset-0 z-40 bg-black/30 opacity-0 pointer-events-none transition-opacity duration-300 md:hidden\" id=\"mobile-drawer-backdrop\"></div>\n<aside class=\"fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-[#fdfcfb] shadow-2xl transform translate-x-full transition-transform duration-300 ease-out md:hidden\" id=\"mobile-drawer\">\n<div class=\"flex items-center justify-between px-5 py-4 border-b border-stone-200\">\n<p class=\"font-body text-xs tracking-[0.08em] text-stone-600\"><span class=\"font-medium\">Sandra Vergara</span><span class=\"text-stone-400 mx-1\">|</span><span class=\"font-light text-[#444444]\">Ingenia</span><span class=\"font-bold text-[#556B2F]\">Food</span></p>\n<button aria-label=\"Cerrar menú de navegación\" class=\"inline-flex items-center justify-center w-9 h-9 rounded-lg border border-stone-300 text-stone-700 hover:text-[#556B2F] hover:border-[#556B2F]/50 transition-colors\" id=\"mobile-menu-close\" type=\"button\">\n<span class=\"material-symbols-outlined\">close</span>\n</button>\n</div>\n<div class=\"px-5 py-6 flex flex-col gap-3\">\n<a class=\"mobile-nav-link text-stone-700 font-medium py-2\" href=\"#app-beta\">App</a>\n<a class=\"mobile-nav-link text-stone-700 font-medium py-2\" href=\"#beneficios\">Beneficios</a>\n<a class=\"mobile-nav-link text-stone-700 font-medium py-2\" href=\"#preview\">Guía gratis</a>\n<a class=\"mobile-nav-link text-stone-700 font-medium py-2\" href=\"#contacto\">Contacto</a>\n<a class=\"mobile-nav-link inline-flex items-center justify-center bg-[#e9967a] text-[#682e19] px-5 py-3 rounded-lg font-bold text-sm mt-3\" href=\"#preview\">Obtener Guía</a>\n</div>\n</aside>\n<main class=\"pt-20\">\n<!-- Hero Section -->\n<section class=\"relative min-h-[620px] md:min-h-[680px] flex items-center overflow-hidden px-8 sm:px-10 lg:px-20\" id=\"inicio\">\n<div class=\"grid lg:grid-cols-12 gap-12 max-w-7xl mx-auto w-full items-center\">\n<div class=\"lg:col-span-7 z-10\">\n<span class=\"inline-block px-4 py-1.5 bg-[#b2ac88] text-[#444024] rounded-full text-xs font-bold tracking-widest uppercase mb-4\">Equilibrio Real</span>\n<p class=\"font-body text-xs sm:text-sm tracking-[0.08em] text-stone-600 mb-3\"><span class=\"font-medium\">Sandra Vergara</span><span class=\"text-stone-400 mx-1.5\">|</span><span class=\"font-light text-[#444444]\">Ingenia</span><span class=\"font-bold text-[#556B2F]\">Food</span></p>\n<h1 class=\"font-sans text-3xl md:text-5xl font-semibold leading-tight text-on-background tracking-tight mb-4\">Tu despensa optimizada con ingeniería</h1>\n<p class=\"text-base md:text-lg text-on-surface-variant max-w-xl mb-4 leading-relaxed\">Estamos desarrollando IngeniaFood, la tecnología que escanea tus ingredientes y diseña la receta perfecta para tu salud y tu tiempo. Muy pronto disponible en versión Beta.</p>\n<div class=\"flex flex-wrap items-center gap-2.5 mb-6\">\n<a aria-label=\"Instagram\" class=\"w-8 h-8 rounded-full border border-stone-300 bg-white text-stone-400 hover:text-[#556B2F] hover:border-[#556B2F]/40 transition-colors flex items-center justify-center\" href=\"https://www.instagram.com/healthysnacks_svn/\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined text-[18px]\">photo_camera</span></a>\n<a aria-label=\"TikTok\" class=\"w-8 h-8 rounded-full border border-stone-300 bg-white text-stone-400 hover:text-[#556B2F] hover:border-[#556B2F]/40 transition-colors flex items-center justify-center\" href=\"https://www.tiktok.com/@healthysnacks_svn\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined text-[18px]\">music_note</span></a>\n<a aria-label=\"YouTube\" class=\"w-8 h-8 rounded-full border border-stone-300 bg-white text-stone-400 hover:text-[#556B2F] hover:border-[#556B2F]/40 transition-colors flex items-center justify-center\" href=\"https://www.youtube.com/@healthysnacks_svn\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined text-[18px]\">smart_display</span></a>\n<a aria-label=\"Facebook\" class=\"w-8 h-8 rounded-full border border-stone-300 bg-white text-stone-400 hover:text-[#556B2F] hover:border-[#556B2F]/40 transition-colors flex items-center justify-center\" href=\"https://www.facebook.com/healthysnackssvn\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined text-[18px]\">thumb_up</span></a>\n</div>\n<div class=\"flex flex-col sm:flex-row gap-4\">\n<a class=\"inline-flex items-center justify-center bg-[#8f4c35] text-white px-6 py-3 rounded-xl font-bold text-base md:text-lg shadow-2xl ring-1 ring-[#8f4c35]/30 hover:shadow-xl transition-all hover:-translate-y-1 text-center\" href=\"/descargar-app\">Descargar App</a>\n<a class=\"inline-flex items-center justify-center border border-outline text-on-surface bg-transparent px-6 py-3 rounded-xl font-bold text-base md:text-lg hover:bg-surface-container-high transition-colors text-center\" href=\"#ingeniafood-redes\">Ver progreso en Redes</a>\n</div>\n</div>\n<div class=\"lg:col-span-5 relative\">\n<div class=\"relative w-full aspect-[4/5] rounded-[2rem] overflow-hidden editorial-shadow transform rotate-2\">\n<img alt=\"Pancakes saludables optimizados por IngeniaFood\" class=\"w-full h-full object-cover\" loading=\"lazy\" src=\"/images/pancakes_fresa.jpg\"/>\n</div>\n<!-- Decorative Element -->\n<div class=\"absolute -bottom-8 -left-8 w-40 h-40 bg-[#b2ac88]/30 rounded-full blur-3xl -z-10\"></div>\n</div>\n</div>\n</section>\n<!-- App en Desarrollo -->\n<section class=\"reveal-on-scroll scroll-mt-24 py-20 px-6 bg-surface-container-low\" id=\"app-beta\">\n<div class=\"max-w-7xl mx-auto\">\n<div class=\"bg-gradient-to-br from-[#f5f2ed] to-[#ece8df] border border-[#d9d2c4] rounded-[2rem] p-8 md:p-12 grid lg:grid-cols-12 gap-8 lg:gap-10 items-center\">\n<div class=\"lg:col-span-7\">\n<span class=\"inline-flex items-center px-4 py-1.5 rounded-full bg-[#556B2F]/15 text-[#556B2F] text-xs sm:text-sm font-extrabold tracking-[0.14em] uppercase mb-5\">Próximamente: Versión Beta</span>\n<h2 class=\"text-3xl md:text-4xl font-bold leading-tight mb-5\">La Ingeniería de tu Nutrición</h2>\n<p class=\"text-on-surface-variant text-base md:text-lg leading-relaxed max-w-2xl mb-8\">IngeniaFood escanea tus ingredientes y utiliza algoritmos para darte la receta perfecta con medidas exactas. Estamos en desarrollo para ofrecerte la mejor experiencia culinaria.</p>\n</div>\n<div class=\"lg:col-span-5\">\n<div class=\"bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 editorial-shadow\">\n<div class=\"w-14 h-14 rounded-2xl bg-[#556B2F]/15 text-[#556B2F] flex items-center justify-center mb-5\">\n<span class=\"material-symbols-outlined text-3xl\">memory</span>\n</div>\n<h3 class=\"text-2xl font-bold mb-3\">Tecnología culinaria inteligente</h3>\n<p class=\"text-[#53433e] leading-relaxed\">Un motor nutricional en tiempo real cruza ingredientes, tiempos y porciones para ayudarte a decidir mejor en segundos.</p>\n</div>\n</div>\n</div>\n</div>\n</section>\n<!-- IngeniaFood en Redes -->\n<section class=\"reveal-on-scroll scroll-mt-24 py-16 md:py-20 px-6 bg-surface\" id=\"ingeniafood-redes\">\n<div class=\"max-w-7xl mx-auto text-center\">\n<h2 class=\"text-3xl md:text-4xl font-bold mb-4\">Mira el proceso en acción</h2>\n<p class=\"text-on-surface-variant text-base md:text-lg max-w-2xl mx-auto mb-8\">Contenido real de nuestras redes para que veas cómo convertimos ingredientes cotidianos en resultados concretos.</p>\n<div class=\"relative w-full max-w-[400px] mx-auto aspect-[9/16] rounded-3xl overflow-hidden editorial-shadow bg-stone-100 mb-8\">\n<iframe class=\"w-full h-full border-0\" loading=\"lazy\" src=\"https://www.instagram.com/reel/DXcjS2zDmnC/embed/captioned/\" title=\"Reel de Instagram de IngeniaFood\" allowfullscreen></iframe>\n</div>\n<div class=\"max-w-3xl mx-auto rounded-3xl border border-[#556B2F]/40 bg-[#f7f5ef] p-6 md:p-8 editorial-shadow\">\n<a class=\"inline-flex w-full sm:w-auto items-center justify-center bg-[#556B2F] text-white px-8 py-4 rounded-xl font-bold text-base md:text-lg hover:brightness-110 transition-all shadow-lg\" href=\"https://www.instagram.com/healthysnacks_svn/\" rel=\"noopener noreferrer\" target=\"_blank\">Sigueme para el lanzamiento de la Beta</a>\n<p class=\"text-on-surface-variant text-sm md:text-base leading-relaxed mt-5 max-w-2xl mx-auto\">No habra registros por mail. El acceso a la version Beta se liberara exclusivamente para mis seguidores en redes sociales el dia del lanzamiento. No te lo pierdas.</p>\n<div class=\"flex flex-wrap items-center justify-center gap-3 mt-6\">\n<a aria-label=\"Instagram\" class=\"w-11 h-11 rounded-full border border-[#556B2F]/30 bg-white text-[#556B2F] hover:bg-[#556B2F] hover:text-white transition-colors flex items-center justify-center\" href=\"https://www.instagram.com/healthysnacks_svn/\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined\">photo_camera</span></a>\n<a aria-label=\"TikTok\" class=\"w-11 h-11 rounded-full border border-[#556B2F]/30 bg-white text-[#556B2F] hover:bg-[#556B2F] hover:text-white transition-colors flex items-center justify-center\" href=\"https://www.tiktok.com/@healthysnacks_svn\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined\">music_note</span></a>\n<a aria-label=\"YouTube\" class=\"w-11 h-11 rounded-full border border-[#556B2F]/30 bg-white text-[#556B2F] hover:bg-[#556B2F] hover:text-white transition-colors flex items-center justify-center\" href=\"https://www.youtube.com/@healthysnacks_svn\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined\">smart_display</span></a>\n<a aria-label=\"Facebook\" class=\"w-11 h-11 rounded-full border border-[#556B2F]/30 bg-white text-[#556B2F] hover:bg-[#556B2F] hover:text-white transition-colors flex items-center justify-center\" href=\"https://www.facebook.com/healthysnackssvn\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined\">thumb_up</span></a>\n</div>\n</div>\n</div>\n</section>\n<!-- Book Preview / Benefits -->\n<section class=\"reveal-on-scroll scroll-mt-24 py-20 bg-surface px-6\" id=\"beneficios\">\n<div class=\"max-w-7xl mx-auto\">\n<div class=\"text-center mb-20\">\n<h2 class=\"text-4xl md:text-5xl font-bold mb-4\">¿Qué hace a esta guía única?</h2>\n<div class=\"w-24 h-1 bg-[#e9967a] mx-auto\"></div>\n</div>\n<div class=\"grid md:grid-cols-3 gap-12\">\n<!-- Benefit 1 -->\n<div class=\"group p-8 rounded-[2rem] bg-[#f5f3ee] hover:bg-white transition-all duration-500 editorial-shadow\">\n<div class=\"w-16 h-16 bg-[#e9967a] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform\">\n<span class=\"material-symbols-outlined text-[#682e19] text-3xl\">timer</span>\n</div>\n<h4 class=\"text-2xl font-bold mb-4\">Menos de 15 min</h4>\n<p class=\"text-[#53433e] leading-relaxed\">Recetas diseñadas para el cronómetro. Del fuego a la mesa en lo que tarda en hervir el agua.</p>\n</div>\n<!-- Benefit 2 -->\n<div class=\"group p-8 rounded-[2rem] bg-[#f5f3ee] hover:bg-white transition-all duration-500 editorial-shadow\">\n<div class=\"w-16 h-16 bg-[#b2ac88] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform\">\n<span class=\"material-symbols-outlined text-[#444024] text-3xl\">kitchen</span>\n</div>\n<h4 class=\"text-2xl font-bold mb-4\">Ingredientes Básicos</h4>\n<p class=\"text-[#53433e] leading-relaxed\">Sin ir a tiendas especializadas. Usamos lo que ya tienes en tu nevera y despensa estándar.</p>\n</div>\n<!-- Benefit 3 -->\n<div class=\"group p-8 rounded-[2rem] bg-[#f5f3ee] hover:bg-white transition-all duration-500 editorial-shadow\">\n<div class=\"w-16 h-16 bg-[#e4e2dd] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform\">\n<span class=\"material-symbols-outlined text-on-surface-variant text-3xl\">check_circle</span>\n</div>\n<h4 class=\"text-2xl font-bold mb-4\">Cero Complicaciones</h4>\n<p class=\"text-[#53433e] leading-relaxed\">Sin técnicas de alta cocina. Pasos directos, claros y sin ensuciar toda la cocina.</p>\n</div>\n</div>\n</div>\n</section>\n<!-- Guía gratuita PDF -->\n<section class=\"reveal-on-scroll scroll-mt-24 py-32 px-6\" id=\"preview\">\n<div class=\"max-w-7xl mx-auto bg-stone-900 rounded-[3rem] p-8 md:p-16 text-white overflow-hidden relative\">\n<div class=\"absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full\"></div>\n<div class=\"grid lg:grid-cols-2 gap-16 items-center relative z-10\">\n<div>\n<p class=\"text-[#e9967a] font-bold text-sm uppercase tracking-widest mb-4\"></p>\n<h2 class=\"text-4xl sm:text-5xl font-bold mb-6 leading-tight\">Descarga GRATIS: <span class=\"text-[#e9967a]\">10 Cenas Rápidas y Sin Harinas</span></h2>\n<p class=\"text-lg text-white/80 mb-10 leading-relaxed\">He seleccionado mis 10 recetas favoritas para cerrar el día de forma ligera. Son cenas optimizadas por IngeniaFood para prepararse en tiempo récord, usando ingredientes reales y 100% libres de harinas refinadas.</p>\n<ul class=\"space-y-6 mb-12\">\n<li class=\"flex items-center gap-4\">\n<span class=\"material-symbols-outlined text-[#b2ac88]\">check_circle</span>\n<span class=\"text-lg opacity-90\">Recetas diseñadas para hacerse en menos de 15 minutos.</span>\n</li>\n<li class=\"flex items-center gap-4\">\n<span class=\"material-symbols-outlined text-[#b2ac88]\">check_circle</span>\n<span class=\"text-lg opacity-90\">Ingredientes sencillos que ya tienes en tu despensa.</span>\n</li>\n<li class=\"flex items-center gap-4\">\n<span class=\"material-symbols-outlined text-[#b2ac88]\">check_circle</span>\n<span class=\"text-lg opacity-90\">Cenas saciantes que no te hacen sentir pesada.</span>\n</li>\n</ul>\n<div class=\"flex flex-wrap items-center gap-4 mb-10\">\n<span class=\"inline-flex items-center bg-[#b2ac88] text-on-tertiary-fixed px-4 py-2 rounded-xl text-lg font-bold uppercase tracking-wider\">100% gratis</span>\n<span class=\"text-white/70 text-sm\">10 Recetas rápidas · IngeniaFood</span>\n</div>\n<a class=\"inline-flex w-full md:w-auto items-center justify-center gap-2 bg-[#e9967a] text-[#682e19] px-10 py-5 rounded-2xl font-extrabold text-lg md:text-xl hover:bg-[#ffb59c] transition-all transform hover:scale-105 shadow-2xl ring-1 ring-[#ffb59c]/40\" href=\"https://drive.google.com/file/d/1Rj0tR-iIoTasbfNVLZlwwmHXEenxroMk/view?usp=drive_link\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined\" data-weight=\"fill\">picture_as_pdf</span>Descargar mis 10 Cenas Sin Harinas (PDF)</a>\n</div>\n<div class=\"relative\">\n<div class=\"bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-[2.5rem] shadow-2xl overflow-hidden\">\n<img alt=\"Wrap sin harinas con huevo, aguacate y rúcula\" class=\"w-full rounded-[2rem] object-cover\" loading=\"lazy\" src=\"/images/guia-10-cenas-wrap.png\"/>\n</div>\n<div class=\"absolute -top-6 -right-6 bg-white text-stone-900 p-6 rounded-full w-32 h-32 flex flex-col items-center justify-center shadow-2xl transform rotate-12\">\n<span class=\"text-xs uppercase font-bold tracking-widest\">PDF</span>\n<span class=\"text-xl font-bold leading-tight text-center\">Súper Rápidas</span>\n</div>\n</div>\n</div>\n</div>\n</section>\n<!-- Contacto y Redes -->\n<section class=\"reveal-on-scroll scroll-mt-24 py-24 px-6 bg-surface-container-low\" id=\"contacto\">\n<div class=\"max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-stretch\">\n<div class=\"lg:col-span-6 bg-white rounded-[2rem] p-8 md:p-10 border border-stone-200 editorial-shadow\">\n<p class=\"text-[#556B2F] font-bold text-xs uppercase tracking-[0.16em] mb-4\">Contacto</p>\n<h2 class=\"text-3xl md:text-4xl font-bold mb-4\">Conecta con IngeniaFood</h2>\n<p class=\"text-on-surface-variant text-lg leading-relaxed mb-8\">Síguenos en redes para avances del lanzamiento, recetas optimizadas y acceso anticipado a la beta de la app.</p>\n<a class=\"inline-flex items-center justify-center w-full sm:w-auto bg-[#556B2F] text-white px-8 py-4 rounded-xl font-bold hover:brightness-110 transition-all\" href=\"https://www.instagram.com/healthysnacks_svn/\" rel=\"noopener noreferrer\" target=\"_blank\">Quiero ser Beta Tester en mis Redes</a>\n</div>\n<div class=\"lg:col-span-6 bg-[#f5f2ed] rounded-[2rem] p-8 md:p-10 border border-[#d9d2c4]\">\n<div class=\"grid sm:grid-cols-2 gap-4\">\n<a class=\"flex items-center gap-3 p-4 rounded-xl bg-white text-on-surface hover:bg-stone-50 transition-colors\" href=\"https://www.instagram.com/healthysnacks_svn/\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined text-[#556B2F]\">photo_camera</span><span class=\"font-semibold\">Instagram</span></a>\n<a class=\"flex items-center gap-3 p-4 rounded-xl bg-white text-on-surface hover:bg-stone-50 transition-colors\" href=\"https://www.tiktok.com/@healthysnacks_svn\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined text-[#556B2F]\">music_note</span><span class=\"font-semibold\">TikTok</span></a>\n<a class=\"flex items-center gap-3 p-4 rounded-xl bg-white text-on-surface hover:bg-stone-50 transition-colors\" href=\"https://www.facebook.com/healthysnackssvn\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined text-[#556B2F]\">thumb_up</span><span class=\"font-semibold\">Facebook</span></a>\n<a class=\"flex items-center gap-3 p-4 rounded-xl bg-white text-on-surface hover:bg-stone-50 transition-colors\" href=\"https://www.youtube.com/@healthysnacks_svn\" rel=\"noopener noreferrer\" target=\"_blank\"><span class=\"material-symbols-outlined text-[#556B2F]\">smart_display</span><span class=\"font-semibold\">YouTube</span></a>\n</div>\n</div>\n</div>\n</section>\n</main>\n<!-- Footer -->\n<footer class=\"bg-[#f5f2ed] w-full py-12 border-t border-stone-200/15\">\n<div class=\"flex flex-col lg:flex-row justify-between items-center px-8 max-w-7xl mx-auto gap-8\">\n<div class=\"flex flex-col items-center lg:items-start gap-2 text-center lg:text-left\">\n<span class=\"text-lg md:text-xl font-sans tracking-[0.04em] leading-snug\"><span class=\"font-normal text-stone-900\">Ingenia</span><span class=\"font-bold text-[#556B2F]\">Food</span></span>\n<p class=\"font-sans text-xs text-stone-500\">@healthysnacks_svn</p>\n<p class=\"font-sans text-xs uppercase tracking-widest text-stone-500\">© 2026 IngeniaFood por Sandra Vergara. Todos los derechos reservados.</p>\n</div>\n<div class=\"flex flex-wrap justify-center gap-6 sm:gap-8\">\n<a class=\"font-sans text-xs uppercase tracking-widest text-stone-500 hover:text-[#e9967a] transition-colors opacity-80 hover:opacity-100\" href=\"#\">Privacidad</a>\n<a class=\"font-sans text-xs uppercase tracking-widest text-stone-500 hover:text-[#e9967a] transition-colors opacity-80 hover:opacity-100\" href=\"#\">Términos</a>\n<a class=\"font-sans text-xs uppercase tracking-widest text-stone-500 hover:text-[#e9967a] transition-colors opacity-80 hover:opacity-100\" href=\"#\">Contacto</a>\n</div>\n<div class=\"flex flex-wrap justify-center gap-4\">\n<a aria-label=\"Instagram @healthysnacks_svn\" class=\"text-stone-500 hover:text-[#8f4c35] transition-colors\" href=\"https://www.instagram.com/healthysnacks_svn/\" rel=\"noopener noreferrer\" target=\"_blank\">\n<svg class=\"w-5 h-5 fill-current\" viewBox=\"0 0 24 24\"><path d=\"M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z\"></path></svg>\n</a>\n<a aria-label=\"TikTok @healthysnacks_svn\" class=\"text-stone-500 hover:text-[#8f4c35] transition-colors\" href=\"https://www.tiktok.com/@healthysnacks_svn\" rel=\"noopener noreferrer\" target=\"_blank\">\n<svg class=\"w-5 h-5 fill-current\" viewBox=\"0 0 24 24\"><path d=\"M19.59 6.69a4.83 4.83 0 0 1-3.77-4.245V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-2.83V8.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z\"></path></svg>\n</a>\n<a aria-label=\"Facebook healthysnackssvn\" class=\"text-stone-500 hover:text-[#8f4c35] transition-colors\" href=\"https://www.facebook.com/healthysnackssvn\" rel=\"noopener noreferrer\" target=\"_blank\">\n<svg class=\"w-5 h-5 fill-current\" viewBox=\"0 0 24 24\"><path d=\"M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z\"></path></svg>\n</a>\n<a aria-label=\"YouTube @healthysnacks_svn\" class=\"text-stone-500 hover:text-[#8f4c35] transition-colors\" href=\"https://www.youtube.com/@healthysnacks_svn\" rel=\"noopener noreferrer\" target=\"_blank\">\n<svg class=\"w-5 h-5 fill-current\" viewBox=\"0 0 24 24\"><path d=\"M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z\"></path></svg>\n</a>\n</div>\n</div>\n</footer>";

export default function LandingPage() {
  const landingHtml = useMemo(
    () =>
      LANDING_HTML.replace('href="/descargar-app">Descargar App</a>', 'href="/app-recetas">Descargar App</a>').replace(
        '<svg aria-hidden="true" class="w-7 h-7 sm:w-8 sm:h-8 text-[#556B2F] shrink-0" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">\n<path d="M11 20A7 7 0 0 1 4 13C4 7.5 8 4 14 4c0 6-3 10-9 10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>\n<path d="M20 4c0 6-4 10-9 10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>\n</svg>',
        '<img alt="Logo de IngeniaFood" class="w-7 h-7 sm:w-8 sm:h-8 shrink-0 object-contain" loading="lazy" src="/icons/icon.svg"/>'
      ),
    []
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      (window as WindowWithDeferredPrompt).__ingeniaDeferredInstallPrompt = event as BeforeInstallPromptEvent;
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    let fallbackRevealTimer: ReturnType<typeof setTimeout> | null = null;
    const sectionToSpy: Record<string, string> = {
      "app-beta": "app",
      "ingeniafood-redes": "app",
      beneficios: "beneficios",
      preview: "preview",
      contacto: "contacto"
    };

    const navBar = document.getElementById("site-nav");
    const navInner = document.getElementById("site-nav-inner");
    const navLinks = document.querySelectorAll<HTMLAnchorElement>("a.nav-spy[data-spy]");
    const sections = document.querySelectorAll<HTMLElement>("main section[id]");
    const revealEls = document.querySelectorAll<HTMLElement>(".reveal-on-scroll");

    const getNavOffset = () => {
      const topNav = document.querySelector("body > nav");
      return (topNav ? topNav.getBoundingClientRect().height : 64) + 8;
    };

    const setActiveNav = (spyKey: string | null) => {
      navLinks.forEach((a) => {
        const match = Boolean(spyKey) && a.getAttribute("data-spy") === spyKey;
        a.classList.toggle("nav-spy--active", match);
        if (match) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    };

    const updateActiveNav = () => {
      if (window.scrollY < 16) {
        setActiveNav(null);
        return;
      }
      const offset = getNavOffset();
      let currentId = "inicio";
      sections.forEach((section) => {
        const id = section.getAttribute("id");
        if (!id) return;
        const r = section.getBoundingClientRect();
        if (r.top <= offset + 4) currentId = id;
      });
      const key = sectionToSpy[currentId];
      setActiveNav(key || null);
    };

    const updateNavVisualState = () => {
      if (!navBar || !navInner) return;
      const isScrolled = window.scrollY > 50;
      navBar.classList.toggle("bg-white", isScrolled);
      navBar.classList.toggle("shadow-lg", isScrolled);
      navBar.classList.toggle("bg-white/70", !isScrolled);
      navBar.classList.toggle("shadow-sm", !isScrolled);
      navInner.classList.toggle("h-16", isScrolled);
      navInner.classList.toggle("h-20", !isScrolled);
    };

    let ticking = false;
    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateNavVisualState();
        updateActiveNav();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    } else if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) e.target.classList.add("is-visible");
          });
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
      );
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    }

    // Fallback: evita secciones ocultas si IntersectionObserver no se activa.
    fallbackRevealTimer = setTimeout(() => {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    }, 1200);

    const toggleBtn = document.getElementById("mobile-menu-toggle");
    const closeBtn = document.getElementById("mobile-menu-close");
    const drawer = document.getElementById("mobile-drawer");
    const backdrop = document.getElementById("mobile-drawer-backdrop");
    const links = document.querySelectorAll(".mobile-nav-link");

    const openDrawer = () => {
      if (!drawer || !backdrop || !toggleBtn) return;
      drawer.classList.remove("translate-x-full");
      backdrop.classList.remove("opacity-0", "pointer-events-none");
      backdrop.setAttribute("aria-hidden", "false");
      toggleBtn.setAttribute("aria-expanded", "true");
      document.body.classList.add("overflow-hidden");
    };

    const closeDrawer = () => {
      if (!drawer || !backdrop || !toggleBtn) return;
      drawer.classList.add("translate-x-full");
      backdrop.classList.add("opacity-0", "pointer-events-none");
      backdrop.setAttribute("aria-hidden", "true");
      toggleBtn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("overflow-hidden");
    };

    const onToggle = () => {
      if (!toggleBtn) return;
      const isOpen = toggleBtn.getAttribute("aria-expanded") === "true";
      if (isOpen) closeDrawer();
      else openDrawer();
    };

    if (toggleBtn && drawer && backdrop) {
      toggleBtn.addEventListener("click", onToggle);
      if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
      backdrop.addEventListener("click", closeDrawer);
      links.forEach((link) => link.addEventListener("click", closeDrawer));
      window.addEventListener("resize", () => {
        if (window.innerWidth >= 768) closeDrawer();
      });
    }

    if (window.location.hash) {
      setTimeout(() => {
        updateNavVisualState();
        updateActiveNav();
      }, 0);
    } else {
      updateNavVisualState();
      updateActiveNav();
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      if (fallbackRevealTimer) clearTimeout(fallbackRevealTimer);
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (toggleBtn) toggleBtn.removeEventListener("click", onToggle);
      if (closeBtn) closeBtn.removeEventListener("click", closeDrawer);
      if (backdrop) backdrop.removeEventListener("click", closeDrawer);
      links.forEach((link) => link.removeEventListener("click", closeDrawer));
    };
  }, []);

  return (
    <>
      <Script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" strategy="beforeInteractive" />
      <Script id="landing-tailwind-config" strategy="beforeInteractive">{`
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            colors: {
              "on-primary": "#ffffff",
              "inverse-on-surface": "#f2f1ec",
              "inverse-surface": "#30312e",
              "tertiary": "#635f40",
              "on-secondary-fixed": "#2e150c",
              "inverse-primary": "#ffb59c",
              "secondary-fixed": "#ffdbd0",
              "on-error": "#ffffff",
              "surface-bright": "#fbf9f4",
              "surface-variant": "#e4e2dd",
              "on-surface-variant": "#53433e",
              "on-primary-fixed-variant": "#723520",
              "tertiary-fixed": "#eae3bc",
              "primary-fixed": "#ffdbd0",
              "surface": "#fbf9f4",
              "secondary": "#7a564a",
              "surface-container": "#f0eee9",
              "on-background": "#1b1c19",
              "error-container": "#ffdad6",
              "on-tertiary": "#ffffff",
              "on-secondary": "#ffffff",
              "background": "#fbf9f4",
              "surface-container-low": "#f5f3ee",
              "surface-dim": "#dbdad5",
              "primary-container": "#e9967a",
              "on-surface": "#1b1c19",
              "on-tertiary-container": "#444024",
              "surface-container-lowest": "#ffffff",
              "on-secondary-container": "#7a574b",
              "tertiary-fixed-dim": "#cec7a2",
              "tertiary-container": "#b2ac88",
              "error": "#ba1a1a",
              "on-primary-container": "#682e19",
              "on-tertiary-fixed": "#1f1c04",
              "on-secondary-fixed-variant": "#5f3f34",
              "secondary-fixed-dim": "#eabcae",
              "outline-variant": "#d9c2bb",
              "surface-container-high": "#eae8e3",
              "on-error-container": "#93000a",
              "surface-container-highest": "#e4e2dd",
              "primary-fixed-dim": "#ffb59c",
              outline: "#86736d",
              "on-primary-fixed": "#390c00",
              "secondary-container": "#ffd0c1",
              "on-tertiary-fixed-variant": "#4b472b",
              primary: "#8f4c35",
              "surface-tint": "#8f4c35"
            },
            borderRadius: {
              DEFAULT: "0.25rem",
              lg: "0.5rem",
              xl: "0.75rem",
              full: "9999px"
            },
            fontFamily: {
              headline: ["Noto Serif"],
              body: ["Manrope"],
              label: ["Manrope"]
            }
          }
        }
      }
      `}</Script>
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Manrope:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
      <link href="/css/base.css" rel="stylesheet" />
      <link href="/css/components.css" rel="stylesheet" />
      <div
        className="min-h-screen selection:bg-[#e9967a] selection:text-[#682e19]"
        style={{ backgroundColor: "#fbf9f4", color: "#1b1c19" }}
        dangerouslySetInnerHTML={{ __html: landingHtml }}
      />
    </>
  );
}
