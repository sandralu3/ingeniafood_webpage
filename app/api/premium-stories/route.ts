import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { extractGeminiTokenUsage, logAiUsage } from "@/lib/ai/log-ai-usage";
import { getUserIsPremium } from "@/lib/auth/user-premium";
import { APP_ROUTES } from "@/lib/navigation/app-routes";
import { buildFallbackPremiumStories } from "@/lib/premium-stories/fallback-stories";
import { getActivePantryIngredients } from "@/lib/premium-stories/get-active-pantry";
import {
  buildPantryFingerprint,
  endOfLocalDayMs,
  premiumStoriesDateKey
} from "@/lib/premium-stories/stories-cache";
import type {
  PremiumStoriesNutritionContext,
  PremiumStory,
  PremiumStoryKind
} from "@/lib/premium-stories/types";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";
export const maxDuration = 45;

type LooseStory = Partial<PremiumStory> & { kind?: string };

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

function normalizeKind(value: string | undefined): PremiumStoryKind | null {
  const v = (value ?? "").toLowerCase().trim();
  if (v === "analysis" || v === "analisis" || v === "análisis") return "analysis";
  if (v === "sandra_tip" || v === "tip" || v === "sandra") return "sandra_tip";
  if (v === "viral_dish" || v === "viral" || v === "plato" || v === "recipe") {
    return "viral_dish";
  }
  return null;
}

function normalizeStories(raw: unknown, fallback: PremiumStory[]): PremiumStory[] {
  const list = Array.isArray((raw as { stories?: unknown })?.stories)
    ? ((raw as { stories: LooseStory[] }).stories as LooseStory[])
    : Array.isArray(raw)
      ? (raw as LooseStory[])
      : null;

  if (!list || list.length === 0) return fallback;

  const byKind = new Map<PremiumStoryKind, PremiumStory>();
  for (const item of list) {
    const kind = normalizeKind(item.kind) ?? normalizeKind(item.id);
    if (!kind || byKind.has(kind)) continue;
    const base = fallback.find((s) => s.kind === kind) ?? fallback[0];
    byKind.set(kind, {
      id: kind,
      kind,
      ringLabel: (item.ringLabel ?? base.ringLabel).toString().slice(0, 24),
      title: (item.title ?? base.title).toString().slice(0, 80),
      body: (item.body ?? base.body).toString().slice(0, 700),
      badge: item.badge ? String(item.badge).slice(0, 24) : base.badge,
      ctaLabel:
        item.ctaLabel === null || item.ctaLabel === undefined
          ? base.ctaLabel
          : String(item.ctaLabel).slice(0, 40),
      ctaHref:
        kind === "viral_dish"
          ? APP_ROUTES.plan
          : kind === "analysis"
            ? String(item.ctaLabel ?? "")
                .toLowerCase()
                .includes("planific")
              ? APP_ROUTES.plan
              : APP_ROUTES.hoy
            : item.ctaHref
              ? String(item.ctaHref)
              : base.ctaHref
    });
  }

  const ordered: PremiumStoryKind[] = ["analysis", "sandra_tip", "viral_dish"];
  return ordered.map((kind) => byKind.get(kind) ?? fallback.find((s) => s.kind === kind)!);
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient();
    if (!supabase) {
      return jsonResponse({ error: "Supabase no configurado.", code: "NO_SUPABASE" }, 500);
    }

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "No autenticado.", code: "UNAUTHORIZED" }, 401);
    }

    const { isPremium, error: premiumError } = await getUserIsPremium(
      supabase,
      user.id,
      user.email
    );

    if (premiumError) {
      return jsonResponse({ error: premiumError, code: "PREMIUM_CHECK_FAILED" }, 500);
    }

    if (!isPremium) {
      return jsonResponse(
        {
          error: "Historias de nutrición disponibles solo para Premium.",
          code: "PREMIUM_REQUIRED"
        },
        403
      );
    }

    let nutrition: PremiumStoriesNutritionContext = {
      totalKcal: 0,
      plannedMealCount: 0,
      hasVegetables: false,
      hasProtein: false,
      mealTitles: []
    };

    try {
      const body = (await request.json()) as {
        nutrition?: Partial<PremiumStoriesNutritionContext>;
      };
      if (body.nutrition) {
        nutrition = {
          totalKcal: Math.max(0, Number(body.nutrition.totalKcal) || 0),
          plannedMealCount: Math.max(0, Number(body.nutrition.plannedMealCount) || 0),
          hasVegetables: Boolean(body.nutrition.hasVegetables),
          hasProtein: Boolean(body.nutrition.hasProtein),
          mealTitles: Array.isArray(body.nutrition.mealTitles)
            ? body.nutrition.mealTitles.map(String).slice(0, 6)
            : []
        };
      }
    } catch {
      // body opcional
    }

    const pantry = await getActivePantryIngredients(supabase, user.id);
    const fallback = buildFallbackPremiumStories(nutrition, pantry.names);
    const dateKey = premiumStoriesDateKey();
    const pantryFingerprint = buildPantryFingerprint(pantry.ids);
    const expiresAt = endOfLocalDayMs();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
    if (!apiKey) {
      return jsonResponse({
        ok: true,
        dateKey,
        pantryFingerprint,
        expiresAt,
        generatedAt: new Date().toISOString(),
        stories: fallback,
        code: "AI_KEY_MISSING_FALLBACK"
      });
    }

    const modelName =
      process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || "gemini-2.0-flash";

    const prompt = `Eres Sandra Vergara, nutricionista de IngeniaFood. Genera EXACTAMENTE 3 "stories" diarias en español para un usuario Premium.
Fecha: ${dateKey}
Contexto menú de hoy: ${JSON.stringify(nutrition)}
Ingredientes ACTIVOS en despensa (usa SOLO estos para el plato viral; si está vacía, sugiere escanear/añadir): ${
      pantry.names.length > 0 ? pantry.names.join(", ") : "(despensa vacía)"
    }

Reglas importantes:
- Si plannedMealCount es 0 (sin menú), en "analysis" motiva a planificar el menú del día (desayuno, almuerzo y cena) para poder analizar el balance y dar recomendaciones personalizadas. CTA sugerida: "Planificar mi día".
- Si hay menú, resume balance (kcal, vegetales, proteína) de forma breve y útil.
- El tip debe ser práctico; si no hay menú, orienta a armar el plan del día.
- El plato viral usa EXCLUSIVAMENTE la despensa listada.

Devuelve SOLO un JSON válido con esta forma:
{
  "stories": [
    {
      "kind": "analysis",
      "ringLabel": "Análisis",
      "title": "Análisis del Día",
      "badge": "Balance",
      "body": "2-3 frases",
      "ctaLabel": "Planificar mi día o Ver mi menú",
      "ctaHref": null
    },
    {
      "kind": "sandra_tip",
      "ringLabel": "Tip",
      "title": "Tip de Sandra",
      "badge": "Premium",
      "body": "consejo práctico en 2-3 frases",
      "ctaLabel": null,
      "ctaHref": null
    },
    {
      "kind": "viral_dish",
      "ringLabel": "Trend",
      "title": "Plato Trend",
      "badge": "Trend",
      "body": "propuesta de plato viral usando EXCLUSIVAMENTE la despensa listada (2-3 frases)",
      "ctaLabel": "Añadir a mi menú",
      "ctaHref": null
    }
  ]
}
No inventes ingredientes fuera de la lista. Sé concreta, motivadora y breve.`;

    let stories = fallback;
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200,
          responseMimeType: "application/json"
        }
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const tokens = extractGeminiTokenUsage(result.response);
      void logAiUsage({
        userId: user.id,
        feature: "premium_stories",
        provider: "gemini",
        model: modelName,
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens
      });
      const jsonText = extractJsonObject(text) ?? text;
      const parsed = JSON.parse(jsonText) as unknown;
      stories = normalizeStories(parsed, fallback);
    } catch (error) {
      console.warn(
        "[premium-stories] AI fallback:",
        error instanceof Error ? error.message : error
      );
      stories = fallback;
    }

    return jsonResponse({
      ok: true,
      dateKey,
      pantryFingerprint,
      expiresAt,
      generatedAt: new Date().toISOString(),
      stories
    });
  } catch (error) {
    console.error("[premium-stories]", error);
    return jsonResponse({ error: "Error generando historias.", code: "UNEXPECTED" }, 500);
  }
}
