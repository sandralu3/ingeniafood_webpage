const LETTER_CHARS = "a-zA-ZáéíóúÁÉÍÓÚñÑüÜ";
const PERSON_NAME_PATTERN = new RegExp(`^[${LETTER_CHARS}\\s'-]+$`);
const DISALLOWED_CHARS = new RegExp(`[^${LETTER_CHARS}\\s'-]`, "g");

const MIN_PERSON_NAME_LENGTH = 2;

export function sanitizePersonNameInput(value: string): string {
  return value.replace(DISALLOWED_CHARS, "");
}

export function getPersonNameValidationError(
  value: string,
  options?: { allowEmpty?: boolean }
): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return options?.allowEmpty
      ? null
      : "Ingresa tu nombre y apellidos para continuar.";
  }

  if (trimmed.length < MIN_PERSON_NAME_LENGTH) {
    return "El nombre debe tener al menos 2 caracteres.";
  }

  if (!PERSON_NAME_PATTERN.test(trimmed)) {
    return "Solo se permiten letras, espacios, guiones y apóstrofes.";
  }

  return null;
}

export function isValidPersonName(value: string, options?: { allowEmpty?: boolean }): boolean {
  return getPersonNameValidationError(value, options) === null;
}
