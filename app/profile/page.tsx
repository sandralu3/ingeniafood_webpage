"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Camera, ChevronDown, LogOut } from "lucide-react";
import { AvatarCropModal } from "@/components/profile/avatar-crop-modal";
import { LanguageSelector } from "@/components/profile/language-selector";
import { PremiumBillingActions } from "@/components/profile/premium-billing-actions";
import { TesterPromoResetButton } from "@/components/profile/tester-promo-reset-button";
import { PremiumLabel } from "@/components/premium/premium-label";
import { ProfileSkeleton } from "@/components/skeletons/profile-skeleton";
import { usePremium } from "@/hooks/use-premium";
import { signOutUser } from "@/lib/auth/sign-out";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { PROFILE_COUNTRIES } from "@/lib/profile/profile-countries";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { resetAllOnboarding } from "@/lib/onboarding/onboarding-state";
import {
  getPersonNameValidationError,
  sanitizePersonNameInput
} from "@/lib/validation/person-name";
import { Input } from "@/components/ui/input";
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
  "h-9 rounded-lg border-stone-200 bg-white px-2.5 text-[12px] focus-visible:border-[#4c6633]/35 focus-visible:ring-[#4c6633]/10";

const selectClassName =
  "h-9 w-full appearance-none rounded-lg border border-stone-200 bg-white px-2.5 pr-8 text-[12px] text-stone-800 focus:border-[#4c6633]/35 focus:outline-none focus:ring-2 focus:ring-[#4c6633]/10";

const labelClassName = "text-[11px] font-medium text-stone-600";

const primaryButtonClassName =
  "w-full rounded-full bg-[#4c6633] px-4 py-2.5 text-[12px] font-semibold text-white shadow-md shadow-[#4c6633]/15 transition hover:bg-[#556B2F] disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClassName =
  "inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-60";

function isMissingCountryColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || error.message?.includes("column profiles.country does not exist") === true;
}

function isMissingLanguageColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("language") === true
  );
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "SV";
  const parts = source.split(/\s+/).filter(Boolean);
  if (!parts.length) return "SV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const { isPremium, refresh: refreshPremium } = usePremium();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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

  const handleShowOnboarding = () => {
    resetAllOnboarding();
    router.push(APP_ROUTES.hoy);
  };

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
          setErrorMessage(t("authError"));
          return;
        }

        setUserId(user.id);
        setEmail(user.email ?? "");

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, country, language, is_premium, created_at, updated_at")
          .eq("id", user.id)
          .maybeSingle<ProfileRow>();

        if (profileError && isMissingLanguageColumnError(profileError)) {
          const { data: withoutLanguage, error: withoutLanguageError } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, country, is_premium, created_at, updated_at")
            .eq("id", user.id)
            .maybeSingle<ProfileRow>();

          if (withoutLanguageError && isMissingCountryColumnError(withoutLanguageError)) {
            const { data: fallbackProfile, error: fallbackError } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url, is_premium, created_at, updated_at")
              .eq("id", user.id)
              .maybeSingle<ProfileRow>();

            if (fallbackError) {
              setErrorMessage(t("loadError"));
              return;
            }

            setFullName(fallbackProfile?.full_name ?? "");
            setCountry("");
            setLanguage(null);
            setAvatarUrl(fallbackProfile?.avatar_url ?? null);
            return;
          }

          if (withoutLanguageError) {
            setErrorMessage(t("loadError"));
            return;
          }

          setFullName(withoutLanguage?.full_name ?? "");
          setCountry(withoutLanguage?.country ?? "");
          setLanguage(null);
          setAvatarUrl(withoutLanguage?.avatar_url ?? null);
          return;
        }

        if (profileError && isMissingCountryColumnError(profileError)) {
          const { data: fallbackProfile, error: fallbackError } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, language, is_premium, created_at, updated_at")
            .eq("id", user.id)
            .maybeSingle<ProfileRow>();

          if (fallbackError) {
            setErrorMessage(t("loadError"));
            return;
          }

          setFullName(fallbackProfile?.full_name ?? "");
          setCountry("");
          setLanguage(fallbackProfile?.language ?? null);
          setAvatarUrl(fallbackProfile?.avatar_url ?? null);
          return;
        }

        if (profileError) {
          setErrorMessage(t("loadError"));
          return;
        }

        setFullName(profile?.full_name ?? "");
        setCountry(profile?.country ?? "");
        setLanguage(profile?.language ?? null);
        setAvatarUrl(profile?.avatar_url ?? null);
      } catch (error) {
        console.error("[profile] Error cargando perfil:", error);
        setErrorMessage(t("loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, [t]);

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

    const nameError = getPersonNameValidationError(fullName, { allowEmpty: true });
    if (nameError) {
      setErrorMessage(nameError);
      showToast(nameError, "error");
      return;
    }

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
        await refreshPremium();
        return;
      }

      // Si fallan columnas nutricionales (migración pendiente), reintentar solo datos básicos.
      if (error) {
        const { error: basicError } = await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim() || null,
            country: country || null
          })
          .eq("id", userId);

        if (basicError && isMissingCountryColumnError(basicError)) {
          const { error: nameOnlyError } = await supabase
            .from("profiles")
            .update({ full_name: fullName.trim() || null })
            .eq("id", userId);
          if (nameOnlyError) {
            setErrorMessage(t("toastSaveError"));
            showToast(t("toastSaveError"), "error");
            return;
          }
          showToast(t("toastSaved"));
          await refreshPremium();
          return;
        }

        if (basicError) {
          setErrorMessage(t("toastSaveError"));
          showToast(t("toastSaveError"), "error");
          return;
        }

        showToast(t("toastSaved"));
        await refreshPremium();
        return;
      }

      showToast(t("toastSaved"));
      await refreshPremium();
    } catch (error) {
      console.error("[profile] Error guardando perfil:", error);
      setErrorMessage(t("toastSaveError"));
      showToast(t("toastSaveError"), "error");
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
    return <ProfileSkeleton />;
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
      <section className="-mx-4 min-h-[calc(100dvh-10rem)] bg-gradient-to-b from-stone-50 via-amber-50/20 to-sv-surface px-4 pb-2 pt-1">
        <div className="mx-auto max-w-md space-y-6">
          <header className="text-center">
            <h1 className="font-serif text-lg font-semibold tracking-tight text-stone-900">
              {t("title")}
            </h1>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
              {t("subtitle")}
            </p>
          </header>

          <div className="flex flex-col items-center gap-2.5 overflow-visible">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="relative h-24 w-24 rounded-full border border-[#4c6633]/35 bg-[#dce7c3]/20 text-[#4c6633]"
              aria-label={t("updateAvatarAria")}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
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
                  {t("uploading")}
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
              <PremiumLabel size="md" />
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl bg-white/90 p-3 shadow-sm">
            <div className="space-y-1">
              <label htmlFor="fullName" className={labelClassName}>
                {t("fullName")}
              </label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(sanitizePersonNameInput(event.target.value))}
                placeholder={t("fullNamePlaceholder")}
                className={inputClassName}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className={labelClassName}>
                {t("email")}
              </label>
              <Input id="email" value={email} disabled className={inputClassName} />
            </div>

            <div className="space-y-1">
              <label htmlFor="country" className={labelClassName}>
                {t("country")}
              </label>
              <div className="relative">
                <select
                  id="country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className={cn(selectClassName, !country && "text-stone-400")}
                >
                  <option value="">{t("countryPlaceholder")}</option>
                  {PROFILE_COUNTRIES.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </div>
            </div>

            <LanguageSelector
              userId={userId}
              profileLanguage={language}
              disabled={isSaving || isUploadingAvatar || isSigningOut}
              onPersisted={(nextLocale) => {
                setLanguage(nextLocale);
                showToast(t("toastLanguageSaved"));
              }}
              onPersistError={() => showToast(t("toastLanguageError"), "error")}
            />

            <PremiumBillingActions />

            <TesterPromoResetButton />

            <button
              type="button"
              onClick={handleShowOnboarding}
              disabled={isSaving || isUploadingAvatar || isSigningOut}
              className={secondaryButtonClassName}
            >
              Ver guía de inicio
            </button>

            {errorMessage ? (
              <p className="rounded-xl border border-red-100 bg-red-50/80 px-3 py-2.5 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSaveChanges()}
              disabled={isSaving || isUploadingAvatar || isSigningOut}
              className={primaryButtonClassName}
            >
              {isSaving ? t("saving") : t("saveChanges")}
            </button>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={isSaving || isUploadingAvatar || isSigningOut}
              className={secondaryButtonClassName}
            >
              <LogOut className="h-3.5 w-3.5" />
              {isSigningOut ? t("signingOut") : t("signOut")}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
