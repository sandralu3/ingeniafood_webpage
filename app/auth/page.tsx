"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IngeniaFoodLogo } from "@/components/shared/ingenia-food-logo";
import { PasswordInput } from "@/components/ui/password-input";
import { createSupabaseClient } from "@/lib/supabaseClient";
import {
  getPersonNameValidationError,
  sanitizePersonNameInput
} from "@/lib/validation/person-name";
import {
  formatAuthRateLimitMessage,
  getAuthRateLimitSeconds,
  isSignupEmailAlreadyRegistered,
  SIGNUP_EMAIL_ALREADY_EXISTS_MESSAGE,
  translateSupabaseAuthError
} from "@/lib/auth/translate-supabase-auth-error";
import { APP_ROUTES } from "@/lib/navigation/app-routes";

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthForm />
    </Suspense>
  );
}

function AuthFallback() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-[#FDFCFB] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <IngeniaFoodLogo variant="auth" />
        <h1 className="mt-5 text-center text-3xl font-bold tracking-tight text-[#1F2937]">
          Iniciar sesión
        </h1>
        <p className="mt-2 text-center text-sm text-[#6B7280]">Cargando formulario de autenticación...</p>
      </section>
    </div>
  );
}

type AuthMode = "login" | "signup" | "forgot";

function resolveInitialMode(modeParam: string | null): AuthMode {
  if (modeParam === "signup") return "signup";
  if (modeParam === "forgot") return "forgot";
  return "login";
}

function AuthForm() {
  const searchParams = useSearchParams();
  const requestedNextPath = searchParams.get("next");
  const nextPath =
    requestedNextPath && requestedNextPath.startsWith("/app-recetas")
      ? requestedNextPath
      : APP_ROUTES.hoy;
  const reason = searchParams.get("reason");
  const showAppRecetasMessage = reason === "app-recetas-auth";
  const passwordResetSuccess = searchParams.get("reset") === "1";
  const authLinkError = searchParams.get("error");
  const initialMode = resolveInitialMode(searchParams.get("mode"));
  const [modeOverride, setModeOverride] = useState<AuthMode | null>(null);
  const mode = modeOverride ?? initialMode;
  const verifiedFromLink = searchParams.get("verified") === "1";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (authLinkError === "exchange_failed") {
      return "No se pudo validar el enlace. Solicita uno nuevo e inténtalo de nuevo.";
    }
    if (authLinkError === "link_expired" || authLinkError === "otp_expired") {
      return "El enlace ha expirado o ya se usó para cambiar la contraseña. Solicita uno nuevo.";
    }
    if (authLinkError) {
      return "No se pudo completar la verificación. Intenta de nuevo.";
    }
    return null;
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);

  useEffect(() => {
    if (!passwordResetSuccess) return;

    const supabase = createSupabaseClient();
    void supabase.auth.signOut({ scope: "global" });
  }, [passwordResetSuccess]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldownSeconds((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldownSeconds]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === "forgot") {
      const emailValue = email.trim();
      if (!emailValue) {
        setErrorMessage("Ingresa el correo asociado a tu cuenta.");
        return;
      }

      setIsSubmitting(true);

      let supabase;
      try {
        supabase = createSupabaseClient();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo inicializar Supabase. Revisa tus variables de entorno."
        );
        setIsSubmitting(false);
        return;
      }

      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
        redirectTo
      });

      if (error) {
        const rateLimitSeconds = getAuthRateLimitSeconds(error);
        if (rateLimitSeconds !== null) {
          setResendCooldownSeconds(rateLimitSeconds);
          setErrorMessage(null);
        } else {
          setErrorMessage(translateSupabaseAuthError(error));
        }
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        "Te enviamos un correo con el enlace para restablecer tu contraseña. Puedes abrirlo en el móvil o en el ordenador; permanecerá activo hasta que cambies la contraseña."
      );
      setResendCooldownSeconds(60);
      setIsSubmitting(false);
      return;
    }

    if (mode === "signup") {
      const nameError = getPersonNameValidationError(fullName);
      if (nameError) {
        setErrorMessage(nameError);
        return;
      }
    }

    if (password.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo inicializar Supabase. Revisa tus variables de entorno."
      );
      setIsSubmitting(false);
      return;
    }

    const emailValue = email.trim();
    const authResult =
      mode === "signup"
        ? await supabase.auth.signUp({
            email: emailValue,
            password,
            options: {
              data: {
                full_name: fullName.trim()
              },
              emailRedirectTo:
                typeof window !== "undefined"
                  ? `${window.location.origin}/auth/confirm-email?next=${encodeURIComponent(APP_ROUTES.hoy)}`
                  : undefined
            }
          })
        : await supabase.auth.signInWithPassword({
            email: emailValue,
            password
          });

    const { error } = authResult;
    if (error) {
      setErrorMessage(translateSupabaseAuthError(error));
      setIsSubmitting(false);
      return;
    }

    if (mode === "signup") {
      if (isSignupEmailAlreadyRegistered(authResult.data?.user)) {
        setErrorMessage(SIGNUP_EMAIL_ALREADY_EXISTS_MESSAGE);
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        "Cuenta creada. Revisa tu correo para confirmar el registro. Puedes abrir el enlace en el móvil o en el ordenador."
      );
      setModeOverride("login");
    } else {
      const session = authResult.data?.session ?? null;
      if (!session) {
        setErrorMessage("No se pudo abrir sesion. Verifica tu correo y contraseña.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Sesion iniciada correctamente. Redirigiendo...");
      window.location.assign(nextPath);
      return;
    }

    if (mode === "signup") {
      setFullName("");
    }
    setEmail("");
    setPassword("");
    setIsSubmitting(false);
  };

  const handleModeChange = (nextMode: AuthMode) => {
    setModeOverride(nextMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const title =
    mode === "signup" ? "Crear cuenta" : mode === "forgot" ? "Recuperar contraseña" : "Iniciar sesión";

  const subtitle =
    mode === "signup"
      ? "Regístrate para guardar recetas saludables y escanear tu nevera."
      : mode === "forgot"
        ? "Te enviaremos un enlace a tu correo. Podrás abrirlo en cualquier dispositivo y seguirá activo hasta que cambies la contraseña."
        : "Ingresa para continuar con tu plan de cocina saludable.";

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-[#FDFCFB] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-7">
        <header className="text-center">
          <IngeniaFoodLogo variant="auth" />
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#1F2937]">{title}</h1>
          <p className="mt-2 text-sm text-[#6B7280]">{subtitle}</p>
          {showAppRecetasMessage ? (
            <p className="mt-2 text-xs font-medium text-[#6B7280]">
              Para guardar tus recetas y usar la IA, necesitas crear una cuenta gratuita.
            </p>
          ) : null}
        </header>

        {mode !== "forgot" ? (
          <div className="mt-5 grid grid-cols-2 rounded-full bg-[#F3F4F6] p-1">
            <button
              type="button"
              onClick={() => handleModeChange("login")}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-[#556B2F]/15 text-[#556B2F] shadow-sm"
                  : "text-[#6B7280] hover:text-[#374151]"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("signup")}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-[#556B2F]/15 text-[#556B2F] shadow-sm"
                  : "text-[#6B7280] hover:text-[#374151]"
              }`}
            >
              Registro
            </button>
          </div>
        ) : null}

        {mode === "forgot" ? (
          <button
            type="button"
            onClick={() => handleModeChange("login")}
            className="mt-5 text-sm font-medium text-[#556B2F] hover:underline"
          >
            ← Volver al inicio de sesión
          </button>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {mode === "signup" ? (
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-[#374151]">
              Nombre y apellidos
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(sanitizePersonNameInput(event.target.value))}
              suppressHydrationWarning
              className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#1F2937] outline-none transition focus:border-[#556B2F]/55 focus:ring-2 focus:ring-[#556B2F]/15"
              placeholder="Ej. Ana López"
              autoComplete="name"
              required
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-[#374151]">
            Correo electronico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            suppressHydrationWarning
            className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#1F2937] outline-none transition focus:border-[#556B2F]/55 focus:ring-2 focus:ring-[#556B2F]/15"
            placeholder="tuemail@correo.com"
            autoComplete="email"
            required
          />
        </div>

        {mode !== "forgot" ? (
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[#374151]">
              Contraseña
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              suppressHydrationWarning
              placeholder="Minimo 6 caracteres"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
              required
            />
          </div>
        ) : null}

        {mode === "login" ? (
          <div className="text-right">
            <button
              type="button"
              onClick={() => handleModeChange("forgot")}
              className="text-sm font-medium text-[#556B2F] hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {mode === "forgot" && resendCooldownSeconds > 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {formatAuthRateLimitMessage(resendCooldownSeconds)}
          </p>
        ) : null}

        {successMessage || verifiedFromLink || passwordResetSuccess ? (
          <p className="rounded-xl border border-brand-green-light/35 bg-brand-green-light/10 px-3 py-2 text-sm text-brand-green-dark">
            {successMessage ??
              (passwordResetSuccess
                ? "Contraseña actualizada. Ya puedes iniciar sesión."
                : "Correo confirmado. Ahora inicia sesion.")}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || (mode === "forgot" && resendCooldownSeconds > 0)}
          className="h-12 w-full rounded-full bg-[#556B2F] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {isSubmitting
            ? mode === "signup"
              ? "Creando cuenta..."
              : mode === "forgot"
                ? "Enviando enlace..."
                : "Ingresando..."
            : mode === "forgot" && resendCooldownSeconds > 0
              ? `Espera ${resendCooldownSeconds}s para reenviar`
              : mode === "signup"
                ? "Crear cuenta"
                : mode === "forgot"
                  ? "Enviar enlace de recuperación"
                  : "Iniciar sesion"}
        </button>
        </form>
      </section>
    </div>
  );
}
