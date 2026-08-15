"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { useSandraAdminGate } from "@/hooks/use-sandra-admin-gate";
import type {
  AdminAiUsageReport,
  AiUsageDayTotal
} from "@/lib/admin/ai-usage-stats";
import type { GeminiLimitStatus } from "@/lib/ai/gemini-free-tier";
import type { SubscriptionCostAnalysis } from "@/lib/ai/subscription-cost-analysis";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value);
}

function formatInt(value: number): string {
  return new Intl.NumberFormat("es-ES").format(value);
}

function formatDayLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(date);
}

export default function AdminUsoIaPage() {
  const authState = useSandraAdminGate("/admin/uso-ia");
  const [report, setReport] = useState<AdminAiUsageReport | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (date?: string | null) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      const response = await fetch(`/api/admin/ai-usage?${params.toString()}`);
      const payload = (await response.json()) as AdminAiUsageReport & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos cargar el uso de IA.");
      }
      setReport(payload);
      setSelectedDate(payload.selectedDate);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al cargar.");
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authState !== "allowed") return;
    void load();
  }, [authState, load]);

  if (authState === "loading") {
    return (
      <section className="flex min-h-[40vh] items-center justify-center px-4 py-10">
        <p className="inline-flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Comprobando acceso…
        </p>
      </section>
    );
  }

  if (authState === "denied") {
    return (
      <section className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-lg font-semibold text-stone-900">Acceso restringido</h1>
        <p className="mt-2 text-sm text-stone-500">
          Esta sección solo está disponible para la administradora de IngeniaFood.
        </p>
        <Link
          href={APP_ROUTES.hoy}
          className="mt-5 inline-flex rounded-full bg-[#4C6B3F] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Volver a Hoy
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4 px-4 py-6 pb-24">
      <div className="flex items-center gap-3">
        <Link
          href={APP_ROUTES.admin}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600"
          aria-label="Volver a Administración"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4C6B3F]/80">
            Admin · Costes
          </p>
          <h1 className="text-xl font-semibold text-stone-900">Uso de IA</h1>
          <p className="text-sm text-stone-500">
            Consumo diario estimado por usuario (Gemini + OpenAI).
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
          <button
            type="button"
            onClick={() => void load(selectedDate)}
            className="ml-2 font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {isLoading && !report ? (
        <div className="flex items-center justify-center py-16 text-sm text-stone-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando consumo…
        </div>
      ) : null}

      {report ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard
              label="Coste periodo"
              value={formatUsd(report.range.estimatedCostUsd)}
              accent
            />
            <StatCard
              label="OpenAI periodo"
              value={formatUsd(report.range.openaiCostUsd)}
            />
            <StatCard
              label="Fotos OpenAI"
              value={formatInt(report.range.openaiImages)}
            />
            <StatCard label="Llamadas" value={formatInt(report.range.calls)} />
          </div>

          <p className="text-[11px] leading-relaxed text-stone-500">
            {report.pricingNote}
          </p>

          <section
            className={cn(
              "rounded-2xl border p-4 shadow-sm",
              report.geminiQuota.anyExceeded
                ? "border-rose-300 bg-rose-50"
                : report.geminiQuota.anyWarning
                  ? "border-amber-300 bg-amber-50"
                  : "border-stone-200 bg-white"
            )}
          >
            <div className="flex items-start gap-2">
              {report.geminiQuota.anyExceeded || report.geminiQuota.anyWarning ? (
                <TriangleAlert
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    report.geminiQuota.anyExceeded
                      ? "text-rose-700"
                      : "text-amber-700"
                  )}
                />
              ) : (
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#4C6B3F]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
                  Gemini · {report.geminiQuota.tierLabel}
                </p>
                <h2 className="text-sm font-semibold text-stone-900">
                  Límites · {report.geminiQuota.modelLabel}
                </h2>
                <p
                  className={cn(
                    "mt-1 text-sm leading-snug",
                    report.geminiQuota.anyExceeded
                      ? "font-medium text-rose-800"
                      : report.geminiQuota.anyWarning
                        ? "text-amber-900"
                        : "text-stone-600"
                  )}
                >
                  {report.geminiQuota.headline}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {report.geminiQuota.metrics.map((metric) => (
                <QuotaMetricCard
                  key={metric.key}
                  label={metric.label}
                  used={metric.used}
                  limit={metric.limit}
                  status={metric.status}
                  detail={metric.detail}
                  formatValue={
                    metric.key === "tpm"
                      ? (n) => formatCompactTokens(n)
                      : formatInt
                  }
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
              RPM/TPM son el <strong>pico del minuto</strong> más cargado del día
              seleccionado (según nuestras llamadas registradas). RPD es el total
              Gemini del día. Coincide con la consola de Google AI Studio en espíritu;
              puede haber pequeñas diferencias de reloj o reintentos.
              {report.geminiQuota.quotaErrorCount > 0
                ? ` También hay ${report.geminiQuota.quotaErrorCount} respuesta(s) de Gemini con error de cuota ese día.`
                : ""}
            </p>
          </section>

          <OpenAiDaySection
            selectedDate={report.selectedDate}
            analysis={report.subscriptionAnalysis}
            day={
              report.days.find((d) => d.date === report.selectedDate) ?? null
            }
          />

          <SubscriptionAnalysisSection
            analysis={report.subscriptionAnalysis}
          />

          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-stone-900">Por día</h2>
              <Sparkles className="h-4 w-4 text-[#4C6B3F]" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {report.days.map((day) => {
                const active = day.date === report.selectedDate;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day.date);
                      void load(day.date);
                    }}
                    className={cn(
                      "min-w-[7.25rem] shrink-0 rounded-xl border px-3 py-2 text-left transition",
                      active
                        ? "border-[#4C6B3F] bg-[#F0F4ED]"
                        : "border-stone-200 bg-stone-50 hover:border-[#4C6B3F]/40"
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                      {formatDayLabel(day.date)}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-stone-900">
                      {formatUsd(day.estimatedCostUsd)}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {formatInt(day.calls)} llamadas
                      {day.openaiImages > 0
                        ? ` · ${formatInt(day.openaiImages)} foto`
                        : ""}
                      {day.openaiCostUsd > 0
                        ? ` · OA ${formatUsd(day.openaiCostUsd)}`
                        : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-900">
              Funciones · {formatDayLabel(report.selectedDate)}
            </h2>
            {report.selectedDayFeatures.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">
                Sin llamadas registradas este día. Tras aplicar la migración, el uso
                nuevo aparecerá aquí.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {report.selectedDayFeatures.map((feature) => (
                  <li
                    key={feature.feature}
                    className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-800">
                        {feature.label}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {formatInt(feature.calls)} llamadas
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-[#4C6B3F]">
                      {formatUsd(feature.estimatedCostUsd)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-900">
              Por usuario · {formatDayLabel(report.selectedDate)}
            </h2>
            {report.selectedDayUsers.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">Nadie usó IA este día.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {report.selectedDayUsers.map((user) => (
                  <li
                    key={user.userId ?? user.email}
                    className="rounded-xl border border-stone-100 bg-stone-50/80 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-900">
                          {user.fullName?.trim() || user.email}
                        </p>
                        {user.fullName ? (
                          <p className="truncate text-[11px] text-stone-500">
                            {user.email}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums text-[#4C6B3F]">
                          {formatUsd(user.estimatedCostUsd)}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          {formatInt(user.calls)} ·{" "}
                          {formatInt(user.inputTokens + user.outputTokens)} tok
                          {user.imageCount > 0
                            ? ` · ${user.imageCount} img`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {user.byFeature.map((feature) => (
                        <span
                          key={feature.feature}
                          className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-stone-600 ring-1 ring-stone-200"
                        >
                          {feature.label}: {formatUsd(feature.estimatedCostUsd)}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}

function formatCompactTokens(value: number): string {
  if (value >= 1000) {
    return `${new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 1
    }).format(value / 1000)}K`;
  }
  return formatInt(value);
}

function OpenAiDaySection({
  selectedDate,
  analysis,
  day
}: {
  selectedDate: string;
  analysis: SubscriptionCostAnalysis;
  day: AiUsageDayTotal | null;
}) {
  const images = day?.openaiImages ?? analysis.selectedDay.openaiImages;
  const cost = day?.openaiCostUsd ?? analysis.selectedDay.openaiCostUsd;
  const calls = day?.openaiCalls ?? analysis.selectedDay.openaiCalls;
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
        OpenAI · pago
      </p>
      <h2 className="text-sm font-semibold text-stone-900">
        Gasto fotos · {formatDayLabel(selectedDate)}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Fotos" value={formatInt(images)} accent />
        <StatCard label="Coste día" value={formatUsd(cost)} />
        <StatCard
          label="$ / imagen"
          value={formatUsd(analysis.openaiImageUsd)}
        />
        <StatCard label="Llamadas OA" value={formatInt(calls)} />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
        Precio unitario calibrado con tu factura (~$0,39 / 9 fotos). En la
        consola de OpenAI, <code className="text-[10px]">gpt-image-1</code>{" "}
        suele aparecer en Responses, no en el bloque Images de DALL·E.
      </p>
    </section>
  );
}

function SubscriptionAnalysisSection({
  analysis
}: {
  analysis: SubscriptionCostAnalysis;
}) {
  const { free, premium, pricing } = analysis;
  return (
    <section className="rounded-2xl border border-[#4C6B3F]/25 bg-gradient-to-br from-[#F0F4ED] to-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4C6B3F]/80">
        Suscripción · análisis
      </p>
      <h2 className="text-sm font-semibold text-stone-900">
        Precio mensual y peticiones recomendadas
      </h2>
      <p className="mt-1 text-sm leading-snug text-stone-700">{analysis.headline}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <PlanQuotaCard plan={free} />
        <PlanQuotaCard plan={premium} />
      </div>

      <div className="mt-3 rounded-xl border border-stone-200 bg-white px-3 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
          Precio Premium sugerido (USD / mes)
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-stone-500">Empate IA</p>
            <p className="text-sm font-semibold tabular-nums text-stone-800">
              {formatUsd(pricing.breakEvenUsd)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-stone-500">Sugerido ×5</p>
            <p className="text-base font-bold tabular-nums text-[#4C6B3F]">
              {formatUsd(pricing.suggestedUsd)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-stone-500">Cómodo ×8</p>
            <p className="text-sm font-semibold tabular-nums text-stone-800">
              {formatUsd(pricing.comfortableUsd)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-stone-500">
          Con {premium.openaiImagesPerMonth} fotos/mes Premium el coste IA es{" "}
          {formatUsd(pricing.aiCostUsdPerPremiumUserMonth)}/usuario. El precio
          sugerido deja margen para Paddle, soporte y picos.
        </p>
      </div>

      <ul className="mt-3 space-y-1.5">
        {pricing.photoScenarios.map((scenario) => (
          <li
            key={scenario.imagesPerMonth}
            className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-2.5 py-1.5 text-[12px] ring-1 ring-stone-200/80"
          >
            <span className="text-stone-600">
              {scenario.imagesPerMonth} fotos/mes → IA{" "}
              {formatUsd(scenario.aiCostUsd)}
            </span>
            <span className="font-semibold tabular-nums text-[#4C6B3F]">
              ~{formatUsd(scenario.suggestedUsd)}/mes
            </span>
          </li>
        ))}
      </ul>

      <ul className="mt-3 space-y-1 text-[11px] leading-relaxed text-stone-500">
        {pricing.assumptions.map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>
    </section>
  );
}

function PlanQuotaCard({
  plan
}: {
  plan: SubscriptionCostAnalysis["free"];
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
        {plan.label}
      </p>
      <p className="mt-1 text-sm font-semibold text-stone-900">
        {plan.scansPerDay} escaneos / día
      </p>
      <p className="text-[11px] text-stone-500">
        ≈ {plan.geminiCallsPerDayEstimate} peticiones Gemini / día (tope)
      </p>
      <p className="mt-1 text-[11px] font-medium text-stone-700">
        OpenAI: {plan.openaiImagesPerMonth} foto(s) / mes
        {plan.openaiCostUsdPerMonth > 0
          ? ` · ${formatUsd(plan.openaiCostUsdPerMonth)}`
          : ""}
      </p>
      <ul className="mt-2 space-y-1 text-[10px] leading-snug text-stone-500">
        {plan.notes.map((note) => (
          <li key={note}>· {note}</li>
        ))}
      </ul>
    </div>
  );
}

function QuotaMetricCard({
  label,
  used,
  limit,
  status,
  detail,
  formatValue
}: {
  label: string;
  used: number;
  limit: number;
  status: GeminiLimitStatus;
  detail: string;
  formatValue: (n: number) => string;
}) {
  const ratio = limit > 0 ? Math.min(1.2, used / limit) : 0;
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        status === "exceeded"
          ? "border-rose-300 bg-white"
          : status === "warning"
            ? "border-amber-300 bg-white"
            : "border-stone-200 bg-stone-50"
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold tabular-nums",
          status === "exceeded"
            ? "text-rose-800"
            : status === "warning"
              ? "text-amber-900"
              : "text-stone-900"
        )}
      >
        {formatValue(used)}
        <span className="font-medium text-stone-400"> / {formatValue(limit)}</span>
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            status === "exceeded"
              ? "bg-rose-500"
              : status === "warning"
                ? "bg-amber-500"
                : "bg-[#4C6B3F]"
          )}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] leading-snug text-stone-500">{detail}</p>
      {status === "exceeded" ? (
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-rose-700">
          Límite superado
        </p>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3 shadow-sm",
        accent
          ? "border-[#4C6B3F]/25 bg-gradient-to-br from-[#F0F4ED] to-white"
          : "border-stone-200 bg-white"
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums text-stone-900 sm:text-lg">
        {value}
      </p>
    </div>
  );
}
