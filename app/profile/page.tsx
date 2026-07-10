"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, ChevronDown, LogOut, Pencil, Users, Wand2 } from "lucide-react";
import { AvatarCropModal } from "@/components/profile/avatar-crop-modal";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import { signOutUser } from "@/lib/auth/sign-out";
import { PROFILE_COUNTRIES } from "@/lib/profile/profile-countries";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ToastState = {
  visible: boolean;
  message: string;
  variant: "success" | "error";
};

const inputClassName =
  "h-11 rounded-xl border-stone-200 bg-white focus-visible:border-[#4c6633]/35 focus-visible:ring-[#4c6633]/10";

const selectClassName =
  "h-11 w-full appearance-none rounded-xl border border-stone-200 bg-white px-3 pr-10 text-sm text-stone-800 focus:border-[#4c6633]/35 focus:outline-none focus:ring-2 focus:ring-[#4c6633]/10";

function isMissingCountryColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.message?.includes("column profiles.country does not exist") === true;
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "SV";
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) return "SV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
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
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropObjectUrlRef = useRef<string | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

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
          .select("id, full_name, avatar_url, country, is_premium, created_at, updated_at")
          .eq("id", user.id)
          .maybeSingle<ProfileRow>();

        if (profileError && isMissingCountryColumnError(profileError)) {
          const { data: fallbackProfile, error: fallbackError } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, is_premium, created_at, updated_at")
            .eq("id", user.id)
            .maybeSingle<ProfileRow>();

          if (fallbackError) {
            setErrorMessage("No pudimos cargar tu perfil. Intenta nuevamente.");
            return;
          }

          setFullName(fallbackProfile?.full_name ?? "");
          setCountry("");
          setAvatarUrl(fallbackProfile?.avatar_url ?? null);
          setIsPremium(Boolean(fallbackProfile?.is_premium));
          return;
        }

        if (profileError) {
          setErrorMessage("No pudimos cargar tu perfil. Intenta nuevamente.");
          return;
        }

        setFullName(profile?.full_name ?? "");
        setCountry(profile?.country ?? "");
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

  useEffect(() => {
    return () => {
      if (cropObjectUrlRef.current) {
        URL.revokeObjectURL(cropObjectUrlRef.current);
      }
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  const showToast = (message: string, variant: ToastState["variant"] = "success") => {
    setToast({ visible: true, message, variant });
  };

  const closeCropModal = () => {
    if (cropObjectUrlRef.current) {
      URL.revokeObjectURL(cropObjectUrlRef.current);
      cropObjectUrlRef.current = null;
    }
    setCropImageSrc(null);
    setIsCropModalOpen(false);
  };

  const handleAvatarClick = () => {
    if (isUploadingAvatar || isLoading) return;
    fileInputRef.current?.click();
  };

  const handleAvatarSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Selecciona un archivo de imagen válido.", "error");
      event.target.value = "";
      return;
    }

    closeCropModal();

    const objectUrl = URL.createObjectURL(file);
    cropObjectUrlRef.current = objectUrl;
    setCropImageSrc(objectUrl);
    setIsCropModalOpen(true);
    event.target.value = "";
  };

  const uploadAvatarFile = async (file: File) => {
    if (!userId) return;

    setIsUploadingAvatar(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseClient();
      const filePath = `${userId}/avatar.jpg`;

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

      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }

      setAvatarUrl(nextAvatarUrl);
      showToast("¡Foto de perfil actualizada!");
    } catch (error) {
      console.error("[profile] Error subiendo avatar:", error);
      showToast("Ocurrió un error al subir tu foto.", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCropConfirm = async (croppedBlob: Blob) => {
    const previewUrl = URL.createObjectURL(croppedBlob);
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    previewObjectUrlRef.current = previewUrl;
    setAvatarUrl(previewUrl);
    closeCropModal();

    const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
    await uploadAvatarFile(croppedFile);
  };

  const handleSaveChanges = async () => {
    if (!userId) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const supabase = createSupabaseClient();
      const payload = {
        full_name: fullName.trim() || null,
        country: country || null
      };

      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);

      if (error && isMissingCountryColumnError(error)) {
        const { error: fallbackError } = await supabase
          .from("profiles")
          .update({ full_name: fullName.trim() || null })
          .eq("id", userId);

        if (fallbackError) {
          setErrorMessage("No pudimos guardar los cambios del perfil.");
          showToast("No se pudo guardar el perfil.", "error");
          return;
        }

        showToast("¡Perfil actualizado! (País pendiente de migración en Supabase)");
        return;
      }

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

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      await signOutUser("/login");
    } catch (error) {
      console.error("[profile] Error cerrando sesión:", error);
      setErrorMessage("No se pudo cerrar sesión. Intenta de nuevo.");
      showToast("No se pudo cerrar sesión.", "error");
      setIsSigningOut(false);
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
          <div className="h-11 rounded-xl bg-stone-100" />
          <div className="h-12 rounded-full bg-stone-100" />
        </div>
      </section>
    );
  }

  return (
    <>
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} />
      <AvatarCropModal
        open={isCropModalOpen}
        imageSrc={cropImageSrc}
        isProcessing={isUploadingAvatar}
        onClose={closeCropModal}
        onConfirm={(croppedBlob) => void handleCropConfirm(croppedBlob)}
      />
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

          <div className="flex flex-col items-center gap-3 overflow-visible">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="relative h-28 w-28 rounded-full border border-[#4c6633]/35 bg-[#dce7c3]/20 text-[#4c6633]"
              aria-label="Actualizar foto de perfil"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar del usuario"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-full text-2xl font-semibold">
                  {getInitials(fullName, email)}
                </span>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#4c6633] text-white shadow-md">
                <Camera className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              {isUploadingAvatar ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-full bg-black/35 text-xs font-medium text-white">
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
              onChange={handleAvatarSelected}
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

            <div className="space-y-2">
              <label htmlFor="country" className="text-sm font-medium text-stone-600">
                País / Región
              </label>
              <div className="relative">
                <select
                  id="country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className={cn(selectClassName, !country && "text-stone-400")}
                >
                  <option value="">Selecciona tu país</option>
                  {PROFILE_COUNTRIES.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </div>
            </div>

            {errorMessage ? (
              <p className="rounded-xl border border-red-100 bg-red-50/80 px-3 py-2.5 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSaveChanges()}
              disabled={isSaving || isUploadingAvatar || isSigningOut}
              className="w-full rounded-full bg-[#4c6633] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4c6633]/20 transition hover:bg-[#556B2F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </button>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={isSaving || isUploadingAvatar || isSigningOut}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3.5 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </button>

            {isAdmin ? (
              <section className="rounded-2xl border border-[#4C6B3F]/15 bg-gradient-to-br from-[#F0F4ED] to-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4C6B3F]/80">
                  Admin · IngeniaFood
                </p>
                <h2 className="mt-1 text-sm font-semibold text-stone-900">
                  Panel de administración
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Gestiona usuarios, importa recetas o edita el catálogo del escáner.
                </p>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/admin/usuarios"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#4C6B3F]/20 bg-white px-4 py-3 text-sm font-semibold text-[#4C6B3F] transition hover:bg-[#F0F4ED]"
                  >
                    <Users className="h-4 w-4" />
                    Administrar usuarios
                  </Link>
                  <Link
                    href="/admin/importar-receta"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#4C6B3F] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
                  >
                    <Wand2 className="h-4 w-4" />
                    Importar receta
                  </Link>
                  <Link
                    href="/admin/catalogo-instagram"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#4C6B3F]/20 bg-white px-4 py-3 text-sm font-semibold text-[#4C6B3F] transition hover:bg-[#F0F4ED]"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar catálogo
                  </Link>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
