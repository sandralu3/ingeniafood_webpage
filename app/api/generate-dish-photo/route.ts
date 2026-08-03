import { NextResponse } from "next/server";
import {
  getOpenAiDishPhotoAccess,
  REAL_PHOTO_USED_MESSAGE,
  REAL_PHOTO_PREMIUM_REQUIRED_MESSAGE
} from "@/lib/recipes/can-generate-openai-dish-photo";
import { generatePremiumDishPhoto } from "@/lib/recipes/generate-recipe-image";
import {
  refundRealPhotoMark,
  tryMarkRealPhotoGenerated
} from "@/lib/recipes/real-photo-quota";
import {
  FREE_DEFAULT_CUISINE_STYLE,
  FREE_DEFAULT_MEAL_TYPE,
  parseRecipeCuisineStyle,
  parseRecipeMealType
} from "@/lib/recipes/premium-recipe-filters";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

export const runtime = "nodejs";
export const maxDuration = 90;

type GenerateDishPhotoBody = {
  title?: string;
  ingredients?: string[];
  tags?: string[];
  tipSandra?: string;
  mealType?: string;
  cuisineStyle?: string;
};

/**
 * Foto OpenAI: cuenta Free = nunca. Premium = 1x lifetime. Admin = ilimitado.
 */
export async function POST(request: Request) {
  let markedOnce = false;
  let userId: string | null = null;

  try {
    const supabase = await createSupabaseRouteClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase no está configurado." }, { status: 500 });
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    userId = user.id;

    const access = await getOpenAiDishPhotoAccess(supabase, user.id, user.email);
    if (!access.allowed) {
      const error =
        access.reason === "PHOTO_USED"
          ? REAL_PHOTO_USED_MESSAGE
          : access.reason === "DISABLED"
            ? "La generación de fotos reales está desactivada."
            : REAL_PHOTO_PREMIUM_REQUIRED_MESSAGE;
      return NextResponse.json({ error, code: access.reason }, { status: 403 });
    }

    if (access.mode === "once") {
      markedOnce = await tryMarkRealPhotoGenerated(user.id);
      if (!markedOnce) {
        return NextResponse.json(
          { error: REAL_PHOTO_USED_MESSAGE, code: "PHOTO_USED" },
          { status: 403 }
        );
      }
    }

    const body = (await request.json()) as GenerateDishPhotoBody;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      if (markedOnce) await refundRealPhotoMark(user.id);
      return NextResponse.json({ error: "Falta el título de la receta." }, { status: 400 });
    }

    const ingredients = Array.isArray(body.ingredients)
      ? body.ingredients.filter((item): item is string => typeof item === "string")
      : [];
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((item): item is string => typeof item === "string")
      : [];

    const mealType = parseRecipeMealType(body.mealType) ?? FREE_DEFAULT_MEAL_TYPE;
    const cuisineStyle = parseRecipeCuisineStyle(body.cuisineStyle) ?? FREE_DEFAULT_CUISINE_STYLE;

    const result = await generatePremiumDishPhoto(
      {
        userId: user.id,
        title,
        ingredients,
        tags,
        mealType,
        cuisineStyle,
        tipSandra: typeof body.tipSandra === "string" ? body.tipSandra : undefined
      },
      { authorizedPaidPremium: true }
    );

    if (result.provider !== "openai") {
      if (markedOnce) await refundRealPhotoMark(user.id);
    }

    return NextResponse.json({
      imageUrl: result.imageUrl,
      provider: result.provider,
      ...(result.error ? { error: result.error } : {})
    });
  } catch (error) {
    if (markedOnce && userId) {
      await refundRealPhotoMark(userId);
    }
    console.error("[generate-dish-photo]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No pudimos generar la foto del plato."
      },
      { status: 500 }
    );
  }
}
