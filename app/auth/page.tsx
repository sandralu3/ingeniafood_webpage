"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CustomButton } from "@/components/shared/custom-button";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthFallback />}>
      <AuthForm />
    </Suspense>
  );
}

function AuthFallback() {
  return (
    <section className="space-y-5 rounded-3xl bg-[#FDFCFB] p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-brand-green-dark">Iniciar sesion</h1>
        <p className="text-sm text-brand-green-dark/75">Cargando formulario de autenticacion...</p>
      </header>
    </section>
  );
}

function AuthForm() {
  const searchParams = useSearchParams();
  const requestedNextPath = searchParams.get("next");
  const nextPath =
    requestedNextPath && requestedNextPath.startsWith("/app-recetas")
      ? requestedNextPath
      : "/app-recetas";
  const queryMode = searchParams.get("mode");
  const reason = searchParams.get("reason");
  const showAppRecetasMessage = reason === "app-recetas-auth";
  const initialMode: "login" | "signup" = queryMode === "signup" ? "signup" : "login";
  const [modeOverride, setModeOverride] = useState<"login" | "signup" | null>(null);
  const mode = modeOverride ?? initialMode;
  const verifiedFromLink = searchParams.get("verified") === "1";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === "signup" && !fullName.trim()) {
      setErrorMessage("Ingresa tu nombre completo para crear tu perfil.");
      return;
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
                  ? `${window.location.origin}/auth/callback?next=${encodeURIComponent("/app-recetas")}`
                  : undefined
            }
          })
        : await supabase.auth.signInWithPassword({
            email: emailValue,
            password
          });

    const { error } = authResult;
    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (mode === "signup") {
      setSuccessMessage(
        "Cuenta creada. Revisa tu correo para confirmar el registro y luego inicia sesion."
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

  const handleModeChange = (nextMode: "login" | "signup") => {
    setModeOverride(nextMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-brand-green-dark">
          {mode === "signup" ? "Crear cuenta" : "Iniciar sesion"}
        </h1>
        <p className="text-sm text-brand-green-dark/75">
          {mode === "signup"
            ? "Registrate para guardar recetas saludables y escanear tu nevera."
            : "Ingresa para continuar con tu plan de cocina saludable."}
        </p>
      </header>

      {showAppRecetasMessage ? (
        <p className="rounded-xl border border-brand-green-light/35 bg-brand-green-light/10 px-3 py-2 text-sm text-brand-green-dark">
          Para guardar tus recetas y usar la IA, necesitas crear una cuenta gratuita.
        </p>
      ) : null}

      <div className="inline-flex rounded-xl border border-brand-green-light/30 bg-white/85 p-1">
        <button
          type="button"
          onClick={() => handleModeChange("login")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            mode === "login"
              ? "bg-[#556B2F] text-white"
              : "text-brand-green-dark/80 hover:bg-brand-green-light/10"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("signup")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            mode === "signup"
              ? "bg-[#556B2F] text-white"
              : "text-brand-green-dark/80 hover:bg-brand-green-light/10"
          }`}
        >
          Registro
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl border border-brand-green-light/25 bg-white/85 p-5 shadow-sm"
      >
        {mode === "signup" ? (
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-brand-green-dark">
              Nombre completo
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              suppressHydrationWarning
              className="h-11 w-full rounded-xl border border-brand-green-light/35 bg-brand-cream px-3 text-sm text-brand-green-dark outline-none transition focus:border-brand-green-dark/60"
              placeholder="Sandra Vergara"
              autoComplete="name"
              required
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-brand-green-dark">
            Correo electronico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            suppressHydrationWarning
            className="h-11 w-full rounded-xl border border-brand-green-light/35 bg-brand-cream px-3 text-sm text-brand-green-dark outline-none transition focus:border-brand-green-dark/60"
            placeholder="tuemail@correo.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-brand-green-dark">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            suppressHydrationWarning
            className="h-11 w-full rounded-xl border border-brand-green-light/35 bg-brand-cream px-3 text-sm text-brand-green-dark outline-none transition focus:border-brand-green-dark/60"
            placeholder="Minimo 6 caracteres"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            required
          />
        </div>

        {errorMessage ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage || verifiedFromLink ? (
          <p className="rounded-xl border border-brand-green-light/35 bg-brand-green-light/10 px-3 py-2 text-sm text-brand-green-dark">
            {successMessage ?? "Correo confirmado. Ahora inicia sesion."}
          </p>
        ) : null}

        <CustomButton
          type="submit"
          disabled={isSubmitting}
          suppressHydrationWarning
          className="h-11 w-full rounded-xl"
        >
          {isSubmitting
            ? mode === "signup"
              ? "Creando cuenta..."
              : "Ingresando..."
            : mode === "signup"
              ? "Crear cuenta"
              : "Iniciar sesion"}
        </CustomButton>
      </form>
    </section>
  );
}
