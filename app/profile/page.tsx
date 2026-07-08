"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Wand2 } from "lucide-react";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import type { Database } from "@/types/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ToastState = {
  visible: boolean;
  message: string;
  variant: "success" | "error";
};

const inputClassName =
  "h-11 rounded-xl border-stone-200 bg-white focus-visible:border-[#4c6633]/35 focus-visible:ring-[#4c6633]/10";

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "SV";
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) return "SV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getFileExtension(file: File): string {
  const fromType = file.type.split("/")[1]?.toLowerCase();
  if (fromType) return fromType === "jpeg" ? "jpg" : fromType;
  const nameParts = file.name.split(".");
  return (nameParts[nameParts.length - 1] ?? "jpg").toLowerCase();
}

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    variant: "success"
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const supabase = createSupabaseClient();
        const {
          data: { user },
          error: userError
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setErrorMessage("No se pudo obtener el usuario autenticado.");
          return;
        }

        setUserId(user.id);
        setEmail(user.email ?? "");
        setIsAdmin(isSandraAdmin(user.email));

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, is_premium, created_at, updated_at")
          .eq("id", user.id)
          .maybeSingle<ProfileRow>();

        if (profileError) {
          setErrorMessage("No pudimos cargar tu perfil. Intenta nuevamente.");
          return;
        }

        setFullName(profile?.full_name ?? "");
        setAvatarUrl(profile?.avatar_url ?? null);
        setIsPremium(Boolean(profile?.is_premium));
      } catch (error) {
        console.error("[profile] Error cargando perfil:", error);
        setErrorMessage("No pudimos cargar tu perfil. Intenta nuevamente.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, []);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [toast.visible]);

  const showToast = (message: string, variant: ToastState["variant"] = "success") => {
    setToast({ visible: true, message, variant });
  };

  const handleAvatarClick = () => {
    if (isUploadingAvatar || isLoading) return;
    fileInputRef.current?.click();
  };

  const handleAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      showToast("Selecciona un archivo de imagen válido.", "error");
      event.target.value = "";
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const extension = getFileExtension(file);
      const filePath = `${userId}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type
      });

      if (uploadError) {
        showToast("No se pudo subir la foto. Intenta de nuevo.", "error");
        return;
      }

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const nextAvatarUrl = `${publicData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: nextAvatarUrl })
        .eq("id", userId);

      if (updateError) {
        showToast("Subimos la imagen, pero no se pudo guardar en tu perfil.", "error");
        return;
      }

      setAvatarUrl(nextAvatarUrl);
      showToast("¡Foto de perfil actualizada!");
    } catch (error) {
      console.error("[profile] Error subiendo avatar:", error);
      showToast("Ocurrió un error al subir tu foto.", "error");
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleSaveChanges = async () => {
    if (!userId) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() || null })
        .eq("id", userId);

      if (error) {
        setErrorMessage("No pudimos guardar los cambios del perfil.");
        showToast("No se pudo guardar el perfil.", "error");
        return;
      }

      showToast("¡Perfil actualizado con éxito!");
    } catch (error) {
      console.error("[profile] Error guardando perfil:", error);
      setErrorMessage("No pudimos guardar los cambios del perfil.");
      showToast("No se pudo guardar el perfil.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="min-h-[calc(100dvh-10rem)] px-1 py-2">
        <div className="mx-auto max-w-md animate-pulse space-y-6">
          <div className="h-8 w-32 rounded-lg bg-stone-100" />
          <div className="mx-auto h-28 w-28 rounded-full bg-stone-100" />
          <div className="h-11 rounded-xl bg-stone-100" />
          <div className="h-11 rounded-xl bg-stone-100" />
          <div className="h-12 rounded-full bg-stone-100" />
        </div>
      </section>
    );
  }

  return (
    <>
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} />
      <section className="min-h-[calc(100dvh-10rem)] px-1 pb-8 pt-2">
        <div className="mx-auto max-w-md space-y-8">
          <header className="text-center">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-900">
              Mi Perfil
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Gestiona tus datos personales y tu foto.
            </p>
          </header>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="relative h-28 w-28 overflow-hidden rounded-full border border-[#4c6633]/35 bg-[#dce7c3]/20 text-[#4c6633]"
              aria-label="Actualizar foto de perfil"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar del usuario" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-semibold">
                  {getInitials(fullName, email)}
                </span>
              )}
              <span className="absolute bottom-0.5 right-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#4c6633] text-white shadow-sm">
                <Camera className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              {isUploadingAvatar ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 text-xs font-medium text-white">
                  <span className="mb-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Subiendo...
                </span>
              ) : null}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void handleAvatarSelected(event)}
            />
            {isPremium ? (
              <Badge variant="secondary" className="border-[#4c6633]/15 bg-[#dce7c3]/30 text-[#4c6633]">
                Premium
              </Badge>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium text-stone-600">
                Nombre completo
              </label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Tu nombre completo"
                className={inputClassName}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-stone-600">
                Correo electrónico
              </label>
              <Input id="email" value={email} disabled className={inputClassName} />
            </div>

            {errorMessage ? (
              <p className="rounded-xl border border-red-100 bg-red-50/80 px-3 py-2.5 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSaveChanges()}
              disabled={isSaving || isUploadingAvatar}
              className="w-full rounded-full bg-[#4c6633] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4c6633]/20 transition hover:bg-[#556B2F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </button>

            {isAdmin ? (
              <section className="rounded-2xl border border-[#4C6B3F]/15 bg-gradient-to-br from-[#F0F4ED] to-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4C6B3F]/80">
                  Admin · IngeniaFood
                </p>
                <h2 className="mt-1 text-sm font-semibold text-stone-900">
                  Importar receta desde Instagram
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Pega la descripción del post, estructura la receta con IA y publícala en el
                  recetario.
                </p>
                <Link
                  href="/admin/importar-receta"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#4C6B3F] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
                >
                  <Wand2 className="h-4 w-4" />
                  Ir a importar receta
                </Link>
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
