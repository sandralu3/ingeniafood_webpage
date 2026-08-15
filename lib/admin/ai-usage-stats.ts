import { listAdminUsers } from "@/lib/admin/users-admin";
import {
  buildGeminiQuotaSnapshot,
  type GeminiQuotaSnapshot
} from "@/lib/ai/gemini-free-tier";
import { estimateAiCostUsd, OPENAI_IMAGE_USD } from "@/lib/ai/pricing";
import {
  buildSubscriptionCostAnalysis,
  type SubscriptionCostAnalysis
} from "@/lib/ai/subscription-cost-analysis";
import {
  AI_USAGE_FEATURE_LABELS,
  type AiUsageFeature,
  type AiUsageProvider
} from "@/lib/ai/usage-types";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { toISODateString } from "@/lib/plan/week-utils";

export type AiUsageDayTotal = {
  date: string;
  calls: number;
  successCalls: number;
  errorCalls: number;
  inputTokens: number;
  outputTokens: number;
  imageCount: number;
  estimatedCostUsd: number;
  geminiCalls: number;
  openaiCalls: number;
  openaiImages: number;
  openaiCostUsd: number;
  geminiCostUsd: number;
};

export type AiUsageUserDay = {
  userId: string | null;
  email: string;
  fullName: string | null;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  imageCount: number;
  estimatedCostUsd: number;
  byFeature: Array<{
    feature: string;
    label: string;
    calls: number;
    estimatedCostUsd: number;
  }>;
};

export type AiUsageFeatureTotal = {
  feature: string;
  label: string;
  calls: number;
  estimatedCostUsd: number;
};

export type AdminAiUsageReport = {
  fromDate: string;
  toDate: string;
  selectedDate: string;
  range: {
    calls: number;
    estimatedCostUsd: number;
    inputTokens: number;
    outputTokens: number;
    imageCount: number;
    openaiCostUsd: number;
    geminiCostUsd: number;
    openaiImages: number;
  };
  days: AiUsageDayTotal[];
  selectedDayUsers: AiUsageUserDay[];
  selectedDayFeatures: AiUsageFeatureTotal[];
  geminiQuota: GeminiQuotaSnapshot;
  subscriptionAnalysis: SubscriptionCostAnalysis;
  pricingNote: string;
};

type EventRow = {
  created_at: string;
  user_id: string | null;
  feature: string;
  provider: string;
  status: string;
  input_tokens: number;
  output_tokens: number;
  image_count: number;
  estimated_cost_usd: number | string;
  meta?: unknown;
};

function asNumber(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function featureLabel(feature: string): string {
  return (
    AI_USAGE_FEATURE_LABELS[feature as AiUsageFeature] ?? feature
  );
}

function localDateFromIso(createdAt: string): string {
  return toISODateString(new Date(createdAt));
}

function defaultDateRange(daysBack = 14): { fromDate: string; toDate: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (daysBack - 1));
  return {
    fromDate: toISODateString(from),
    toDate: toISODateString(to)
  };
}

function emptyDay(date: string): AiUsageDayTotal {
  return {
    date,
    calls: 0,
    successCalls: 0,
    errorCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    imageCount: 0,
    estimatedCostUsd: 0,
    geminiCalls: 0,
    openaiCalls: 0,
    openaiImages: 0,
    openaiCostUsd: 0,
    geminiCostUsd: 0
  };
}

function rowCost(row: EventRow): number {
  const provider =
    row.provider === "openai" || row.provider === "gemini"
      ? (row.provider as AiUsageProvider)
      : "gemini";
  return estimateAiCostUsd({
    provider,
    inputTokens: asNumber(row.input_tokens),
    outputTokens: asNumber(row.output_tokens),
    imageCount: asNumber(row.image_count)
  });
}

export async function fetchAdminAiUsageReport(params?: {
  fromDate?: string;
  toDate?: string;
  selectedDate?: string;
}): Promise<AdminAiUsageReport> {
  const defaults = defaultDateRange(14);
  const fromDate = params?.fromDate?.trim() || defaults.fromDate;
  const toDate = params?.toDate?.trim() || defaults.toDate;
  const selectedDate =
    params?.selectedDate?.trim() &&
    params.selectedDate >= fromDate &&
    params.selectedDate <= toDate
      ? params.selectedDate.trim()
      : toDate;

  const admin = getSupabaseAdminClient();
  const fromInstant = new Date(`${fromDate}T00:00:00`);
  const toInstant = new Date(`${toDate}T23:59:59.999`);

  const { data, error } = await admin
    .from("ai_usage_events")
    .select(
      "created_at, user_id, feature, provider, status, input_tokens, output_tokens, image_count, estimated_cost_usd, meta"
    )
    .gte("created_at", fromInstant.toISOString())
    .lte("created_at", toInstant.toISOString())
    .order("created_at", { ascending: false })
    .limit(20_000);

  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") {
      return emptyReport(fromDate, toDate, selectedDate);
    }
    throw new Error(`No pudimos cargar el uso de IA: ${error.message}`);
  }

  const rows = (data ?? []) as EventRow[];
  const dayMap = new Map<string, AiUsageDayTotal>();

  for (const row of rows) {
    const date = localDateFromIso(row.created_at);
    const current = dayMap.get(date) ?? emptyDay(date);
    const cost = rowCost(row);
    const images = asNumber(row.image_count);
    current.calls += 1;
    if (row.status === "error") current.errorCalls += 1;
    else current.successCalls += 1;
    current.inputTokens += asNumber(row.input_tokens);
    current.outputTokens += asNumber(row.output_tokens);
    current.imageCount += images;
    current.estimatedCostUsd += cost;
    if (row.provider === "gemini") {
      current.geminiCalls += 1;
      current.geminiCostUsd += cost;
    }
    if (row.provider === "openai") {
      current.openaiCalls += 1;
      current.openaiImages += images;
      current.openaiCostUsd += cost;
    }
    dayMap.set(date, current);
  }

  const days: AiUsageDayTotal[] = [];
  const cursor = new Date(`${fromDate}T12:00:00`);
  const end = new Date(`${toDate}T12:00:00`);
  while (cursor.getTime() <= end.getTime()) {
    const iso = toISODateString(cursor);
    days.push(dayMap.get(iso) ?? emptyDay(iso));
    cursor.setDate(cursor.getDate() + 1);
  }
  days.reverse();

  const range = days.reduce(
    (acc, day) => {
      acc.calls += day.calls;
      acc.estimatedCostUsd += day.estimatedCostUsd;
      acc.inputTokens += day.inputTokens;
      acc.outputTokens += day.outputTokens;
      acc.imageCount += day.imageCount;
      acc.openaiCostUsd += day.openaiCostUsd;
      acc.geminiCostUsd += day.geminiCostUsd;
      acc.openaiImages += day.openaiImages;
      return acc;
    },
    {
      calls: 0,
      estimatedCostUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      imageCount: 0,
      openaiCostUsd: 0,
      geminiCostUsd: 0,
      openaiImages: 0
    }
  );

  const selectedRows = rows.filter(
    (row) => localDateFromIso(row.created_at) === selectedDate
  );
  const selectedDayTotals = dayMap.get(selectedDate) ?? emptyDay(selectedDate);
  const selectedGemini = selectedRows.filter((row) => row.provider === "gemini");
  const geminiQuota = buildGeminiQuotaSnapshot({
    selectedDate,
    geminiEvents: selectedGemini.map((row) => ({
      created_at: row.created_at,
      input_tokens: asNumber(row.input_tokens),
      output_tokens: asNumber(row.output_tokens),
      status: row.status,
      meta: row.meta
    }))
  });

  const subscriptionAnalysis = buildSubscriptionCostAnalysis({
    selectedDate,
    openaiImagesSelectedDay: selectedDayTotals.openaiImages,
    openaiCostUsdSelectedDay: selectedDayTotals.openaiCostUsd,
    openaiCallsSelectedDay: selectedDayTotals.openaiCalls
  });

  const usersDirectory = await listAdminUsers().catch(() => [] as Awaited<
    ReturnType<typeof listAdminUsers>
  >);
  const profileById = new Map(
    usersDirectory.map((user) => [
      user.id,
      { email: user.email, fullName: user.fullName }
    ])
  );

  type UserAgg = {
    userId: string | null;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    imageCount: number;
    estimatedCostUsd: number;
    features: Map<string, { calls: number; estimatedCostUsd: number }>;
  };

  const userMap = new Map<string, UserAgg>();
  const featureMap = new Map<string, { calls: number; estimatedCostUsd: number }>();

  for (const row of selectedRows) {
    const key = row.user_id ?? "__anonymous__";
    const userAgg = userMap.get(key) ?? {
      userId: row.user_id,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      imageCount: 0,
      estimatedCostUsd: 0,
      features: new Map()
    };
    const cost = rowCost(row);
    userAgg.calls += 1;
    userAgg.inputTokens += asNumber(row.input_tokens);
    userAgg.outputTokens += asNumber(row.output_tokens);
    userAgg.imageCount += asNumber(row.image_count);
    userAgg.estimatedCostUsd += cost;
    const feat = userAgg.features.get(row.feature) ?? {
      calls: 0,
      estimatedCostUsd: 0
    };
    feat.calls += 1;
    feat.estimatedCostUsd += cost;
    userAgg.features.set(row.feature, feat);
    userMap.set(key, userAgg);

    const featureAgg = featureMap.get(row.feature) ?? {
      calls: 0,
      estimatedCostUsd: 0
    };
    featureAgg.calls += 1;
    featureAgg.estimatedCostUsd += cost;
    featureMap.set(row.feature, featureAgg);
  }

  const selectedDayUsers: AiUsageUserDay[] = Array.from(userMap.values())
    .map((agg) => {
      const profile = agg.userId ? profileById.get(agg.userId) : null;
      return {
        userId: agg.userId,
        email: profile?.email ?? (agg.userId ? "Usuario sin email" : "Sistema / sin usuario"),
        fullName: profile?.fullName ?? null,
        calls: agg.calls,
        inputTokens: agg.inputTokens,
        outputTokens: agg.outputTokens,
        imageCount: agg.imageCount,
        estimatedCostUsd: agg.estimatedCostUsd,
        byFeature: Array.from(agg.features.entries())
          .map(([feature, value]) => ({
            feature,
            label: featureLabel(feature),
            calls: value.calls,
            estimatedCostUsd: value.estimatedCostUsd
          }))
          .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd)
      };
    })
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);

  const selectedDayFeatures: AiUsageFeatureTotal[] = Array.from(
    featureMap.entries()
  )
    .map(([feature, value]) => ({
      feature,
      label: featureLabel(feature),
      calls: value.calls,
      estimatedCostUsd: value.estimatedCostUsd
    }))
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);

  return {
    fromDate,
    toDate,
    selectedDate,
    range: {
      ...range,
      estimatedCostUsd: roundMoney(range.estimatedCostUsd),
      openaiCostUsd: roundMoney(range.openaiCostUsd),
      geminiCostUsd: roundMoney(range.geminiCostUsd)
    },
    days: days.map((day) => ({
      ...day,
      estimatedCostUsd: roundMoney(day.estimatedCostUsd),
      openaiCostUsd: roundMoney(day.openaiCostUsd),
      geminiCostUsd: roundMoney(day.geminiCostUsd)
    })),
    selectedDayUsers: selectedDayUsers.map((user) => ({
      ...user,
      estimatedCostUsd: roundMoney(user.estimatedCostUsd),
      byFeature: user.byFeature.map((f) => ({
        ...f,
        estimatedCostUsd: roundMoney(f.estimatedCostUsd)
      }))
    })),
    selectedDayFeatures: selectedDayFeatures.map((f) => ({
      ...f,
      estimatedCostUsd: roundMoney(f.estimatedCostUsd)
    })),
    geminiQuota,
    subscriptionAnalysis,
    pricingNote: `OpenAI foto ≈ $${OPENAI_IMAGE_USD.toFixed(3)} (factura real). Gemini free ≈ $0 salvo tokens estimados. Periodo ${fromDate} → ${toDate}.`
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function emptyReport(
  fromDate: string,
  toDate: string,
  selectedDate: string
): AdminAiUsageReport {
  return {
    fromDate,
    toDate,
    selectedDate,
    range: {
      calls: 0,
      estimatedCostUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      imageCount: 0,
      openaiCostUsd: 0,
      geminiCostUsd: 0,
      openaiImages: 0
    },
    days: [],
    selectedDayUsers: [],
    selectedDayFeatures: [],
    geminiQuota: buildGeminiQuotaSnapshot({
      selectedDate,
      geminiEvents: []
    }),
    subscriptionAnalysis: buildSubscriptionCostAnalysis({
      selectedDate,
      openaiImagesSelectedDay: 0,
      openaiCostUsdSelectedDay: 0,
      openaiCallsSelectedDay: 0
    }),
    pricingNote:
      "Aplica la migración ai_usage_events en Supabase para empezar a registrar el gasto OpenAI/Gemini."
  };
}
