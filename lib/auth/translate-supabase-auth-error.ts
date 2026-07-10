type AuthErrorInput = {
  message?: string;
  code?: string;
  status?: number;
};

const RATE_LIMIT_MESSAGE_PATTERN =
  /for security purposes, you can only request this(?: once every| after)? (\d+) seconds?/i;

function extractSecondsFromMessage(message: string): number | null {
  const match = message.match(/(\d+)\s*seconds?/i);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function formatAuthRateLimitMessage(seconds: number): string {
  if (seconds === 1) {
    return "Por seguridad, debes esperar 1 segundo antes de solicitar otro enlace.";
  }

  return `Por seguridad, debes esperar ${seconds} segundos antes de solicitar otro enlace.`;
}

export function getAuthRateLimitSeconds(error: AuthErrorInput): number | null {
  const message = error.message ?? "";
  const rateLimitMatch = message.match(RATE_LIMIT_MESSAGE_PATTERN);

  if (rateLimitMatch) {
    return Number(rateLimitMatch[1]);
  }

  if (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit" ||
    error.code === "over_sms_send_rate_limit" ||
    /frequency limit reached/i.test(message) ||
    /rate limit/i.test(message)
  ) {
    return extractSecondsFromMessage(message) ?? 60;
  }

  return null;
}

const CODE_MESSAGES: Record<string, string> = {
  over_email_send_rate_limit: "Por seguridad, debes esperar antes de solicitar otro correo.",
  over_request_rate_limit: "Has hecho demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  over_sms_send_rate_limit: "Por seguridad, debes esperar antes de solicitar otro código.",
  invalid_credentials: "Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo.",
  email_not_confirmed: "Confirma tu correo antes de iniciar sesión.",
  user_already_exists: "Ya existe una cuenta con este correo. Prueba a iniciar sesión.",
  email_exists: "Ya existe una cuenta con este correo. Prueba a iniciar sesión.",
  signup_disabled: "El registro no está disponible en este momento.",
  weak_password: "La contraseña es demasiado débil. Usa al menos 6 caracteres.",
  same_password: "La nueva contraseña debe ser distinta de la actual.",
  otp_expired: "El enlace ha expirado o ya fue usado. Solicita uno nuevo.",
  session_expired: "Tu sesión ha expirado. Vuelve a iniciar sesión.",
  email_address_invalid: "El correo no tiene un formato válido.",
  user_not_found: "Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo."
};

const MESSAGE_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /invalid login credentials/i,
    message: "Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo."
  },
  {
    pattern: /email not confirmed/i,
    message: "Confirma tu correo antes de iniciar sesión."
  },
  {
    pattern: /user already registered/i,
    message: "Ya existe una cuenta con este correo. Prueba a iniciar sesión."
  },
  {
    pattern: /password should be at least/i,
    message: "La contraseña debe tener al menos 6 caracteres."
  },
  {
    pattern: /unable to validate email address/i,
    message: "El correo no tiene un formato válido."
  },
  {
    pattern: /email rate limit exceeded/i,
    message: "Has solicitado demasiados correos. Espera un momento e inténtalo de nuevo."
  },
  {
    pattern: /frequency limit reached/i,
    message: "Por seguridad, debes esperar antes de solicitar otro enlace."
  }
];

export function translateSupabaseAuthError(error: AuthErrorInput): string {
  const message = error.message?.trim() ?? "";
  const rateLimitSeconds = getAuthRateLimitSeconds(error);

  if (rateLimitSeconds !== null) {
    return formatAuthRateLimitMessage(rateLimitSeconds);
  }

  if (error.code && CODE_MESSAGES[error.code]) {
    return CODE_MESSAGES[error.code];
  }

  for (const { pattern, message: translated } of MESSAGE_PATTERNS) {
    if (pattern.test(message)) {
      return translated;
    }
  }

  return message || "No se pudo completar la operación. Inténtalo de nuevo.";
}
