"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
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
    <div className="flex min-h-[80vh] items-center justify-center bg-[#FDFCFB] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-[#1F2937]">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Cargando formulario de autenticación...</p>
      </section>
    </div>
  );
}

function AuthForm() {
  const searchParams = useSearchParams();
  const requestedNextPath = searchParams.get("next");
  const nextPath =
    requestedNextPath && requestedNextPath.startsWith("/app-recetas")
      ? requestedNextPath
      : "/app-recetas";
  const reason = searchParams.get("reason");
  const showAppRecetasMessage = reason === "app-recetas-auth";
  const initialMode: "login" | "signup" = "login";
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
    <div className="flex min-h-[80vh] items-center justify-center bg-[#FDFCFB] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-7">
        <header className="text-center">
          <p className="text-sm tracking-[0.08em] text-stone-700">
            <span className="font-medium">Sandra Vergara</span>
            <span className="mx-1 text-stone-400">|</span>
            <span className="font-light text-[#444444]">Ingenia</span>
            <span className="font-bold text-[#556B2F]">Food</span>
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#1F2937]">
            {mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            {mode === "signup"
              ? "Regístrate para guardar recetas saludables y escanear tu nevera."
              : "Ingresa para continuar con tu plan de cocina saludable."}
          </p>
          {showAppRecetasMessage ? (
            <p className="mt-2 text-xs font-medium text-[#6B7280]">
              Para guardar tus recetas y usar la IA, necesitas crear una cuenta gratuita.
            </p>
          ) : null}
        </header>

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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {mode === "signup" ? (
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-[#374151]">
              Nombre completo
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              suppressHydrationWarning
              className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#1F2937] outline-none transition focus:border-[#556B2F]/55 focus:ring-2 focus:ring-[#556B2F]/15"
              placeholder="Sandra Vergara"
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

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-[#374151]">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            suppressHydrationWarning
            className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#1F2937] outline-none transition focus:border-[#556B2F]/55 focus:ring-2 focus:ring-[#556B2F]/15"
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-full bg-[#556B2F] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {isSubmitting
            ? mode === "signup"
              ? "Creando cuenta..."
              : "Ingresando..."
            : mode === "signup"
              ? "Crear cuenta"
              : "Iniciar sesion"}
        </button>
        </form>
      </section>
    </div>
  );
}
