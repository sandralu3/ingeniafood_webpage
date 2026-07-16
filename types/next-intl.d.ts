import type en from "../messages/en.json";

type Messages = typeof en;

declare global {
  // Tipado de claves para useTranslations / getTranslations
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IntlMessages extends Messages {}
}

export {};
