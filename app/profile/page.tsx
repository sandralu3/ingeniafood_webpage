"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
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
      <section className="min-h-[calc(100dvh-10rem)] bg-brand-cream p-4">
        <div className="mx-auto max-w-md animate-pulse rounded-2xl border border-brand-green-light/20 bg-white p-6">
          <div className="mx-auto h-24 w-24 rounded-full bg-brand-green-light/20" />
          <div className="mt-6 h-10 rounded-lg bg-brand-green-light/15" />
          <div className="mt-3 h-10 rounded-lg bg-brand-green-light/15" />
          <div className="mt-6 h-10 rounded-lg bg-brand-green-light/20" />
        </div>
      </section>
    );
  }

  return (
    <>
      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} />
      <section className="min-h-[calc(100dvh-10rem)] bg-brand-cream px-4 py-6">
        <div className="mx-auto max-w-md rounded-2xl border border-brand-green-light/25 bg-white p-6 shadow-sm">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-brand-green-dark">Mi Perfil</h1>
            <p className="mt-1 text-sm text-stone-600">Gestiona tus datos personales y tu foto.</p>
          </header>

          <div className="mb-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="relative h-28 w-28 overflow-hidden rounded-full border border-brand-green-light/40 bg-brand-green-light/15 text-brand-green-dark"
              aria-label="Actualizar foto de perfil"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar del usuario" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold">{getInitials(fullName, email)}</span>
              )}
              <span className="absolute bottom-1 right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-brand-green-light/40 bg-white text-brand-green-dark shadow-sm">
                <Camera className="h-4 w-4" />
              </span>
              {isUploadingAvatar ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-xs font-medium text-white">
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
            {isPremium ? <Badge variant="secondary">Premium</Badge> : null}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="fullName" className="text-sm font-medium text-stone-700">
                Nombre completo
              </label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-stone-700">
                Correo electrónico
              </label>
              <Input id="email" value={email} disabled />
            </div>

            {errorMessage ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <Button
              type="button"
              onClick={() => void handleSaveChanges()}
              disabled={isSaving || isUploadingAvatar}
              className="w-full"
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
