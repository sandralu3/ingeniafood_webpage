import type { OnboardingPage } from "@/lib/onboarding/onboarding-state";

export type OnboardingStep = {
  /** Selector to spotlight. If absent, show a centered full-screen tooltip. */
  targetSelector?: string;
  title: string;
  description: string;
  /** Position of the tooltip relative to the spotlight element. */
  position?: "top" | "bottom" | "left" | "right";
};

const HOY_STEPS: OnboardingStep[] = [
  {
    title: "¡Bienvenida a IngeniaFood! 🌿",
    description:
      "Esta es tu pantalla de Hoy. Aquí ves tu progreso diario, retos y lo que has comido."
  },
  {
    targetSelector: "[data-onboarding='hoy-scan-banner']",
    title: "Escanea tu despensa",
    description:
      "Toca aquí para abrir el escáner, haz una foto a tu nevera y te generaremos recetas.",
    position: "bottom"
  },
  {
    targetSelector: "[data-onboarding='hoy-add-meals']",
    title: "Agrega tus comidas",
    description:
      "Planifica tu día: toca los slots para añadir, y edita lo que ya tienes con el menú de hoy.",
    position: "bottom"
  },
  {
    targetSelector: "[data-onboarding='hoy-streak']",
    title: "Mira tu racha",
    description:
      "Aquí ves cuántos días seguidos llevas cuidándote. Toca la tarjeta para ver el calendario.",
    position: "top"
  },
  {
    targetSelector: "[data-onboarding='hoy-dose']",
    title: "Ver tu dosis nutricional",
    description:
      "Consulta tu balance nutricional y tus consejos. Toca la tarjeta para abrir el informe.",
    position: "top"
  },
  {
    targetSelector: "[data-onboarding='hoy-water']",
    title: "Hidratación",
    description:
      "Lleva un registro de los vasos de agua que bebes cada día. ¡Toca un vaso para sumarlo!",
    position: "top"
  },
  {
    targetSelector: "[data-onboarding='hoy-challenges']",
    title: "Retos diarios",
    description:
      "Completa pequeños retos de nutrición para ganar puntos y mantener tu racha.",
    position: "top"
  }
];

const PLAN_STEPS: OnboardingStep[] = [
  {
    title: "Tu plan semanal 📅",
    description:
      "Aquí organizas tus comidas de la semana: desayuno, almuerzo y cena para cada día."
  },
  {
    targetSelector: "[data-onboarding='plan-day-carousel']",
    title: "Selecciona un día",
    description:
      "Desliza o toca un día para ver y editar sus comidas.",
    position: "bottom"
  },
  {
    targetSelector: "[data-onboarding='plan-meals-almuerzo']",
    title: "Registra tu Almuerzo",
    description:
      "Este es tu bloque de Almuerzo. Toca un hueco vacío para añadir una receta, o el check para marcar «Ya comí».",
    position: "bottom"
  },
  {
    targetSelector: "[data-onboarding='plan-snacks']",
    title: "Snacks / Tentempié",
    description:
      "Desplázate aquí para registrar tus snacks. Toca las opciones para añadirlos y marcarlos como completados.",
    position: "top"
  },
  {
    targetSelector: "[data-onboarding='plan-shopping-list']",
    title: "Lista de compra",
    description:
      "Desde aquí generas la lista de ingredientes de tu semana para hacer la compra más rápido.",
    position: "bottom"
  },
  {
    targetSelector: "[data-onboarding='plan-copy-previous-week']",
    title: "Copiar semana anterior",
    description:
      "En el menú de acciones puedes copiar tu semana anterior para no empezar desde cero.",
    position: "bottom"
  }
];

const SCANNER_STEPS: OnboardingStep[] = [
  {
    title: "Escáner de despensa 📸",
    description:
      "Haz una foto a tu nevera o despensa y detectaremos los ingredientes automáticamente."
  },
  {
    targetSelector: "[data-onboarding='scanner-camera-btn']",
    title: "Escanea ahora",
    description:
      "Toca este botón para abrir la cámara o elegir una foto de tu galería.",
    position: "bottom"
  },
  {
    targetSelector: "[data-onboarding='scanner-ingredients']",
    title: "Tus ingredientes",
    description:
      "También puedes añadir ingredientes a mano escribiendo en la barra de búsqueda.",
    position: "top"
  }
];

const RECETAS_STEPS: OnboardingStep[] = [
  {
    title: "Tu biblioteca de recetas 📖",
    description:
      "Aquí encuentras todas tus recetas guardadas, favoritas y las recetas de Sandra."
  },
  {
    targetSelector: "[data-onboarding='recetas-view-more-saved']",
    title: "Cocinar",
    description:
      "Son tus recetas generadas desde el escáner. Toca «Ver más» para ver todo el listado.",
    position: "bottom"
  },
  {
    targetSelector: "[data-onboarding='recetas-view-more-sandra']",
    title: "Sandra",
    description:
      "Son recetas que Sandra ha subido. Toca «Ver más» para ver todas las de esta sección.",
    position: "top"
  },
  {
    targetSelector: "[data-onboarding='recetas-view-more-favorites']",
    title: "Favoritas",
    description:
      "Son las recetas que has marcado como favoritas. Toca «Ver más» para verlas todas.",
    position: "top"
  },
  {
    targetSelector: "[data-onboarding='recetas-view-more-outside']",
    title: "Registradas",
    description:
      "Son las recetas que tú has registrado en el planificador semanal. Toca «Ver más» para ver el historial.",
    position: "top"
  },
  {
    targetSelector: "[data-onboarding='recetas-filter-types']",
    title: "Filtra por tipo de comida",
    description:
      "Dentro de «Ver más» puedes abrir los filtros para buscar por tipos de comidas (por ejemplo desayuno, almuerzo, cena).",
    position: "bottom"
  },
];

export const ONBOARDING_STEPS: Record<OnboardingPage, OnboardingStep[]> = {
  hoy: HOY_STEPS,
  plan: PLAN_STEPS,
  scanner: SCANNER_STEPS,
  recetas: RECETAS_STEPS
};
