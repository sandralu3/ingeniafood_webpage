const STORAGE_KEY = "ingeniafood:onboarding-completed-v1";

export type OnboardingPage = "hoy" | "plan" | "scanner" | "recetas";

/** Pages that need onboarding (everything except profile). */
export const ONBOARDING_PAGES: OnboardingPage[] = [
  "hoy",
  "plan",
  "scanner",
  "recetas"
];

type OnboardingRecord = Record<OnboardingPage, boolean>;

function readRecord(): OnboardingRecord {
  const defaults: OnboardingRecord = {
    hoy: false,
    plan: false,
    scanner: false,
    recetas: false
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<OnboardingRecord>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function isOnboardingCompleted(page: OnboardingPage): boolean {
  return readRecord()[page] === true;
}

export function isAllOnboardingCompleted(): boolean {
  const record = readRecord();
  return ONBOARDING_PAGES.every((page) => record[page]);
}

export function markOnboardingCompleted(page: OnboardingPage): void {
  const record = readRecord();
  record[page] = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* quota full – silent */
  }
}

export function resetAllOnboarding(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* silent */
  }
}
