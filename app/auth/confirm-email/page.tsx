"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { IngeniaFoodLogo } from "@/components/shared/ingenia-food-logo";
import {
  activateEmailConfirmation,
  isEmailConfirmationLinkExpiredError
} from "@/lib/auth/activate-email-confirmation";
import {
  cleanEmailConfirmationParamsFromUrl,
  clearPendingEmailConfirmation,
  hasEmailConfirmationCredential,
  mergeEmailConfirmationTokens,
  persistPendingEmailConfirmation,
  readEmailConfirmationParamsFromLocation,
  readPendingEmailConfirmation,
  resolveEmailConfirmationDestination
} from "@/lib/auth/pending-email-confirmation-token";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { translateSupabaseAuthError } from "@/lib/auth/translate-supabase-auth-error";
import {
  clearStashedReferralCode,
  readStashedReferralCode
} from "@/lib/referral/referral";

const REDIRECT_DELAY_MS = 2000;
const CONFIRMATION_LINK_EXPIRED_MESSAGE =
  "Este enlace de activación ha expirado o ya se usó. Regístrate de nuevo o solicita un nuevo correo.";
const CONFIRMATION_LINK_MISSING_MESSAGE =
  "No encontramos un enlace de activación válido. Revisa el correo más reciente.";

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<ConfirmEmailFallback />}>
      <ConfirmEmailForm />
    </Suspense>
  );
}

function ConfirmEmailFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4 py-12">
      <section className="w-full max-w-[22rem] rounded-3xl border border-stone-100/80 bg-white/90 p-7 shadow-[0_18px_50px_-28px_rgba(62,82,25,0.35)] backdrop-blur-sm">
        <IngeniaFoodLogo variant="auth" />
        <h1 className="mt-5 text-center font-serif text-2xl font-semibold tracking-tight text-stone-900">
          Confirmar correo
        </h1>
        <p className="mt-3 text-center text-sm text-stone-500">Preparando activación...</p>
      </section>
    </div>
  );
}

function ConfirmEmailForm() {
  const searchParams = useSearchParams();
  const linkExpired = searchParams.get("error") === "link_expired";

  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const [hasValidLink, setHasValidLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [destinationPath, setDestinationPath] = useState("/login?verified=1");

  useEffect(() => {
    if (linkExpired) {
      setIsCheckingLink(false);
      setHasValidLink(false);
      return;
    }

    let isMounted = true;

    const prepareConfirmation = async () => {
      try {
        const incomingToken = readEmailConfirmationParamsFromLocation(
          window.location.search,
          window.location.hash
        );
        const storedToken = readPendingEmailConfirmation();
        const pendingToken = mergeEmailConfirmationTokens(storedToken, incomingToken);

        if (hasEmailConfirmationCredential(incomingToken)) {
          persistPendingEmailConfirmation(pendingToken);
          cleanEmailConfirmationParamsFromUrl();
        }

        if (!isMounted) return;

        if (hasEmailConfirmationCredential(pendingToken)) {
          setHasValidLink(true);
          setDestinationPath(resolveEmailConfirmationDestination(pendingToken.nextPath));
          return;
        }

        setHasValidLink(false);
      } catch {
        if (isMounted) {
          setHasValidLink(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingLink(false);
        }
      }
    };

    void prepareConfirmation();

    return () => {
      isMounted = false;
    };
  }, [linkExpired]);

  const handleConfirm = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseClient();
      const pendingToken = readPendingEmailConfirmation();

      if (!hasEmailConfirmationCredential(pendingToken)) {
        setErrorMessage(CONFIRMATION_LINK_MISSING_MESSAGE);
        setIsSubmitting(false);
        return;
      }

      const { error: activationError } = await activateEmailConfirmation(supabase, pendingToken);

      if (activationError) {
        setErrorMessage(
          isEmailConfirmationLinkExpiredError(activationError)
            ? CONFIRMATION_LINK_EXPIRED_MESSAGE
            : translateSupabaseAuthError(activationError)
        );
        setIsSubmitting(false);
        return;
      }

      clearPendingEmailConfirmation();

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        const referralCode = readStashedReferralCode();
        if (referralCode) {
          try {
            await fetch("/api/premium/attach-referral", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ref: referralCode })
            });
          } catch {
            // Continuar al destino; HOY mostrará banner si el attach llegó por access-gate.
          } finally {
            clearStashedReferralCode();
          }
        }
      }

      const nextPath = resolveEmailConfirmationDestination(pendingToken.nextPath);
      setDestinationPath(session ? nextPath : "/login?verified=1");
      setIsSuccess(true);

      window.setTimeout(() => {
        window.location.assign(session ? nextPath : "/login?verified=1");
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
            Confirmar correo
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Activa tu cuenta para empezar a guardar recetas y escanear tu nevera.
          </p>
        </header>

        {isCheckingLink ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#556B2F]" />
            Verificando enlace...
          </div>
        ) : null}

        {!isCheckingLink && (linkExpired || !hasValidLink) ? (
          <div className="mt-8 space-y-4">
            <p className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-900">
              {linkExpired ? CONFIRMATION_LINK_EXPIRED_MESSAGE : CONFIRMATION_LINK_MISSING_MESSAGE}
            </p>
            <Link
              href="/login?mode=signup"
              className="flex h-11 w-full items-center justify-center rounded-full bg-[#556B2F] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#4c6633]"
            >
              Volver al registro
            </Link>
          </div>
        ) : null}

        {!isCheckingLink && hasValidLink && !isSuccess ? (
          <div className="mt-8 space-y-4">
            <p className="rounded-2xl border border-[#dce7c3]/80 bg-[#f4f7ed]/80 px-4 py-3 text-sm leading-relaxed text-[#3e5219]">
              Puedes abrir este enlace en el móvil o en el ordenador. Solo se activará cuando pulses
              el botón de abajo.
            </p>

            {errorMessage ? (
              <p className="rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm leading-relaxed text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#556B2F] px-4 text-sm font-bold text-white shadow-[0_10px_24px_-14px_rgba(85,107,47,0.85)] transition hover:bg-[#4c6633] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Activando...
                </>
              ) : (
                "Activar mi cuenta"
              )}
            </button>
          </div>
        ) : null}

        {isSuccess ? (
          <div className="mt-8 rounded-2xl border border-[#dce7c3]/80 bg-gradient-to-br from-[#f4f7ed] to-white px-4 py-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-[#556B2F]" strokeWidth={1.75} />
            <p className="mt-3 text-sm font-semibold text-[#3e5219]">¡Correo confirmado!</p>
            <p className="mt-1 text-sm text-stone-500">
              {destinationPath.startsWith("/login")
                ? "Te llevamos al inicio de sesión en unos segundos..."
                : "Entrando a tu cuenta..."}
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
