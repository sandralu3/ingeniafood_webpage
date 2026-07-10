"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { IngeniaFoodLogo } from "@/components/shared/ingenia-food-logo";
import { PasswordInput } from "@/components/ui/password-input";
import { createSupabaseClient } from "@/lib/supabaseClient";

const MIN_PASSWORD_LENGTH = 6;
const REDIRECT_DELAY_MS = 2000;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4 py-12">
      <section className="w-full max-w-[22rem] rounded-3xl border border-stone-100/80 bg-white/90 p-7 shadow-[0_18px_50px_-28px_rgba(62,82,25,0.35)] backdrop-blur-sm">
        <IngeniaFoodLogo variant="auth" />
        <h1 className="mt-5 text-center font-serif text-2xl font-semibold tracking-tight text-stone-900">
          Nueva contraseña
        </h1>
        <p className="mt-3 text-center text-sm text-stone-500">Preparando formulario...</p>
      </section>
    </div>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const linkExpired = searchParams.get("error") === "link_expired";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (linkExpired) {
      setIsCheckingSession(false);
      setHasValidSession(false);
      return;
    }

    let isMounted = true;

    const verifyRecoverySession = async () => {
      try {
        const supabase = createSupabaseClient();
        const queryParams = new URLSearchParams(window.location.search);
        const recoveryCode = queryParams.get("code");
        const tokenHash = queryParams.get("token_hash");

        if (recoveryCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(recoveryCode);

          if (!isMounted) return;

          if (!exchangeError) {
            setHasValidSession(true);
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("code");
            cleanUrl.searchParams.delete("type");
            window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}`);
            setIsCheckingSession(false);
            return;
          }
        }

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery"
          });

          if (!isMounted) return;

          if (!error) {
            setHasValidSession(true);
            window.history.replaceState(null, "", window.location.pathname);
            setIsCheckingSession(false);
            return;
          }
        }

        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (!isMounted) return;

          if (!error) {
            setHasValidSession(true);
            window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
            setIsCheckingSession(false);
            return;
          }
        }

        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!isMounted) return;
        setHasValidSession(Boolean(session));
      } catch {
        if (isMounted) {
          setHasValidSession(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    void verifyRecoverySession();

    const supabase = createSupabaseClient();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasValidSession(true);
        setIsCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [linkExpired]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword || !trimmedConfirm) {
      setErrorMessage("Completa ambos campos para continuar.");
      return;
    }

    if (trimmedPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setErrorMessage("Las contraseñas no coinciden. Revísalas e inténtalo de nuevo.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: trimmedPassword });

      if (error) {
        setErrorMessage(
          error.message || "No pudimos actualizar tu contraseña. Solicita un nuevo enlace."
        );
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);

      const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
      if (signOutError) {
        console.error("[reset-password] signOut:", signOutError);
      }

      window.setTimeout(() => {
        window.location.assign("/login?reset=1");
      }, REDIRECT_DELAY_MS);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado. Intenta de nuevo en unos minutos."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4 py-12">
      <section className="w-full max-w-[22rem] rounded-3xl border border-stone-100/80 bg-white/90 p-7 shadow-[0_18px_50px_-28px_rgba(62,82,25,0.35)] backdrop-blur-sm sm:max-w-md sm:p-8">
        <header className="text-center">
          <IngeniaFoodLogo variant="auth" />
          <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight text-stone-900 sm:text-[1.7rem]">
            Nueva contraseña
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Crea una clave segura para volver a acceder a tu cuenta con tranquilidad.
          </p>
        </header>

        {isCheckingSession ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
            Verificando enlace seguro...
          </div>
        ) : null}

        {!isCheckingSession && (linkExpired || !hasValidSession) ? (
          <div className="mt-8 space-y-4">
            <p className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-900">
              {linkExpired
                ? "Este enlace ha expirado o ya fue utilizado. Solicita uno nuevo para restablecer tu contraseña. Abre el enlace en el mismo navegador donde pediste la recuperación (Chrome, Edge, Safari, etc.)."
                : "No encontramos una sesión de recuperación activa. Abre el enlace desde el correo más reciente en el mismo navegador donde lo solicitaste."}
            </p>
            <Link
              href="/login?mode=forgot"
              className="flex h-11 w-full items-center justify-center rounded-full bg-[#556B2F] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#4c6633]"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        ) : null}

        {!isCheckingSession && hasValidSession && !isSuccess ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.08em] text-stone-500">
                Escribe tu nueva contraseña
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 border-stone-200 bg-[#FDFCFB] focus:border-[#556B2F]/45 focus:ring-[#556B2F]/12"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-stone-500"
              >
                Confirma tu contraseña
              </label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 border-stone-200 bg-[#FDFCFB] focus:border-[#556B2F]/45 focus:ring-[#556B2F]/12"
                placeholder="Repite la misma contraseña"
                autoComplete="new-password"
                disabled={isSubmitting}
                required
              />
            </div>

            {errorMessage ? (
              <p className="rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm leading-relaxed text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#556B2F] px-4 text-sm font-bold text-white shadow-[0_10px_24px_-14px_rgba(85,107,47,0.85)] transition hover:bg-[#4c6633] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar contraseña"
              )}
            </button>
          </form>
        ) : null}

        {isSuccess ? (
          <div className="mt-8 rounded-2xl border border-[#dce7c3]/80 bg-gradient-to-br from-[#f4f7ed] to-white px-4 py-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-[#556B2F]" strokeWidth={1.75} />
            <p className="mt-3 text-sm font-semibold text-[#3e5219]">
              ¡Contraseña actualizada con éxito!
            </p>
            <p className="mt-1 text-sm text-stone-500">
              Te llevamos al inicio de sesión en unos segundos...
            </p>
          </div>
        ) : null}

        <p className="mt-6 text-center text-xs text-stone-400">
          <Link href="/login" className="font-medium text-[#556B2F] transition hover:text-[#4c6633] hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </section>
    </div>
  );
}
