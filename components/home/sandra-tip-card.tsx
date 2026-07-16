"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lightbulb, Loader2, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import { getBuiltinHealthyTips, getWeeklySandraTip } from "@/lib/content/builtin-tips";
import { pickDailyTipIndex } from "@/lib/content/daily-tip";
import {
  clearTipsCache,
  readTipsCache,
  writeTipsCache,
  type HealthyTip
} from "@/lib/content/tips-cache";
import { parseAppLocale } from "@/i18n/config";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { HoySectionHeader } from "@/components/hoy/hoy-section-header";
import { cn } from "@/lib/utils";

type SandraTipCardProps = {
  variant?: "default" | "hoy";
  className?: string;
};

function isMissingLanguageColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("language") === true
  );
}

export function SandraTipCard({ variant = "default", className }: SandraTipCardProps) {
  const t = useTranslations("Hoy");
  const tCommon = useTranslations("Common");
  const locale = parseAppLocale(useLocale());
  const [tips, setTips] = useState<HealthyTip[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTipContent, setNewTipContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchTips = useCallback(
    async (options?: { skipCache?: boolean }) => {
      const cached = options?.skipCache ? null : readTipsCache(locale);
      if (cached?.length) {
        setTips(cached);
        setIsLoading(false);
        return cached;
      }

      const supabase = createSupabaseClient();
      const withLanguage = await supabase
        .from("tips_saludables")
        .select("id, contenido, creado_at, language")
        .eq("language", locale)
        .order("creado_at", { ascending: true });

      let rows: HealthyTip[] = [];

      if (withLanguage.error && isMissingLanguageColumnError(withLanguage.error)) {
        // Migración pendiente: la BD solo tiene tips en español.
        if (locale === "es") {
          const legacy = await supabase
            .from("tips_saludables")
            .select("id, contenido, creado_at")
            .order("creado_at", { ascending: true });

          if (legacy.error) {
            console.error("[sandra-tip] Error cargando tips:", legacy.error);
            rows = getBuiltinHealthyTips(locale);
          } else {
            rows = (legacy.data ?? []).map((row) => ({ ...row, language: "es" as const }));
            if (rows.length === 0) rows = getBuiltinHealthyTips(locale);
          }
        } else {
          rows = getBuiltinHealthyTips(locale);
        }
      } else if (withLanguage.error) {
        console.error("[sandra-tip] Error cargando tips:", withLanguage.error);
        rows = getBuiltinHealthyTips(locale);
      } else {
        rows = withLanguage.data ?? [];
        if (rows.length === 0) {
          rows = getBuiltinHealthyTips(locale);
        }
      }

      writeTipsCache(locale, rows);
      setTips(rows);
      setLoadError(null);
      setIsLoading(false);
      return rows;
    },
    [locale, t]
  );

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const supabase = createSupabaseClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        setUserId(user?.id ?? null);
        setIsAdmin(isSandraAdmin(user?.email));

        await fetchTips();
      } catch (error) {
        console.error("[sandra-tip] Error inicializando:", error);
        setLoadError(t("tipLoadError"));
        setTips(getBuiltinHealthyTips(locale));
        setIsLoading(false);
      }
    };

    void load();
  }, [fetchTips, locale, t]);

  const dailyTipIndex = useMemo(
    () => pickDailyTipIndex({ userId, tipsLength: tips.length }),
    [tips.length, userId]
  );

  const hasTips = tips.length > 0;
  const currentTip = hasTips ? tips[dailyTipIndex] : null;
  const displayContent = currentTip?.contenido ?? getWeeklySandraTip(locale);

  const handleOpenAddModal = () => {
    setSaveError(null);
    setNewTipContent("");
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    if (isSaving) return;
    setShowAddModal(false);
    setSaveError(null);
    setNewTipContent("");
  };

  const handleSaveTip = async () => {
    const contenido = newTipContent.trim();
    if (!contenido) {
      setSaveError(t("tipSaveEmpty"));
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const supabase = createSupabaseClient();
      const insertWithLanguage = await supabase
        .from("tips_saludables")
        .insert([{ contenido, language: locale }])
        .select("id, contenido, creado_at, language")
        .single();

      let data = insertWithLanguage.data;
      let error = insertWithLanguage.error;

      if (error && isMissingLanguageColumnError(error)) {
        const legacy = await supabase
          .from("tips_saludables")
          .insert([{ contenido }])
          .select("id, contenido, creado_at")
          .single();
        data = legacy.data ? { ...legacy.data, language: "es" } : null;
        error = legacy.error;
      }

      if (error || !data) {
        console.error("[sandra-tip] Error insertando tip:", error);
        setSaveError(t("tipSaveError"));
        return;
      }

      const updatedTips = [...tips.filter((tip) => !tip.id.startsWith("builtin-")), data];
      setTips(updatedTips);
      writeTipsCache(locale, updatedTips);
      setNewTipContent("");
      setShowAddModal(false);
    } catch (error) {
      console.error("[sandra-tip] Error guardando tip:", error);
      setSaveError(t("tipSaveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshTips = () => {
    clearTipsCache(locale);
    void fetchTips({ skipCache: true });
  };

  const isHoyVariant = variant === "hoy";

  const adminAddButton = isAdmin ? (
    <button
      type="button"
      onClick={handleOpenAddModal}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-[#556B2F]/20 bg-white/80 text-[#556B2F] shadow-sm transition hover:border-[#556B2F]/35 hover:bg-white",
        isHoyVariant
          ? "px-2 py-0.5 text-[10px] font-semibold"
          : "px-2.5 py-1 text-[11px] font-medium"
      )}
      aria-label={t("addTipAria")}
    >
      <Plus className={cn(isHoyVariant ? "h-3 w-3" : "h-3.5 w-3.5")} strokeWidth={2} />
      {t("addTip")}
    </button>
  ) : null;

  const tipBody = (
    <>
      {isLoading ? (
        <div
          className={cn(
            "flex items-center gap-1.5 text-stone-500",
            isHoyVariant ? "text-xs" : "mt-4 text-sm"
          )}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#556B2F]" />
          {t("loadingTip")}
        </div>
      ) : (
        <div className={isHoyVariant ? undefined : "mt-4"}>
          {loadError ? (
            <p
              className={cn(
                "text-red-700",
                isHoyVariant ? "text-xs leading-relaxed" : "text-sm leading-7"
              )}
            >
              {loadError}
            </p>
          ) : (
            <p
              className={cn(
                isHoyVariant
                  ? "text-xs leading-relaxed text-stone-700"
                  : "text-sm leading-7 text-stone-700"
              )}
            >
              {displayContent}
            </p>
          )}
        </div>
      )}

      {isAdmin && loadError ? (
        <button
          type="button"
          onClick={handleRefreshTips}
          className="mt-2 text-[10px] font-medium text-[#556B2F] underline-offset-2 hover:underline"
        >
          {t("tipRetry")}
        </button>
      ) : null}
    </>
  );

  return (
    <>
      {isHoyVariant ? (
        <section className={cn("space-y-2", className)}>
          <HoySectionHeader
            title={t("tipOfDay")}
            subtitle={hasTips ? t("tipSubtitle") : undefined}
            action={adminAddButton}
          />
          <aside className="rounded-2xl bg-gradient-to-br from-[#EEF4E6] via-white to-[#dce7c3]/50 p-3 shadow-sm shadow-[#556B2F]/5">
            <div className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#556B2F] shadow-sm">
                <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">{tipBody}</div>
            </div>
          </aside>
        </section>
      ) : (
        <aside
          className={cn(
            "relative rounded-2xl border border-brand-green-light/30 bg-brand-green-light/10 px-5 py-6 shadow-sm",
            className
          )}
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-base font-semibold text-brand-green-dark">
                {t("tipOfDay")}
              </h3>
              {hasTips ? (
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                  {t("tipSubtitle")}
                </p>
              ) : null}
            </div>
            {adminAddButton}
          </div>
          {tipBody}
        </aside>
      )}

      {isAdmin && showAddModal ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-tip-title"
            className="relative w-full max-w-md rounded-2xl border border-[#556B2F]/15 bg-white p-5 shadow-xl"
          >
            <button
              type="button"
              onClick={handleCloseAddModal}
              disabled={isSaving}
              className="absolute right-3 top-3 rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50"
              aria-label={tCommon("close")}
            >
              <X className="h-4 w-4" />
            </button>

            <h2 id="add-tip-title" className="pr-8 font-serif text-lg font-semibold text-stone-800">
              {t("addTipTitle")}
            </h2>
            <p className="mt-1 text-xs text-stone-500">{t("addTipHint")}</p>

            <textarea
              value={newTipContent}
              onChange={(event) => setNewTipContent(event.target.value)}
              rows={5}
              placeholder={t("addTipPlaceholder")}
              className="mt-4 w-full resize-none rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-3 text-sm leading-relaxed text-stone-800 outline-none transition focus:border-[#556B2F]/35 focus:ring-2 focus:ring-[#556B2F]/10"
              disabled={isSaving}
            />

            {saveError ? (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {saveError}
              </p>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCloseAddModal}
                disabled={isSaving}
                className="flex-1 rounded-full border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleSaveTip()}
                disabled={isSaving || !newTipContent.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#3e5219] to-[#556B2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("saveTip")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
