import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

/**
 * Cliente OpenAI solo servidor.
 * No importar desde componentes client.
 */
export function getOpenAI(): OpenAI {
  if (openaiClient) {
    return openaiClient;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Falta OPENAI_API_KEY en el entorno.");
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

/** Compat: instancia perezosa vía getter para no fallar el import sin clave. */
export const openai = {
  get images() {
    return getOpenAI().images;
  }
};
