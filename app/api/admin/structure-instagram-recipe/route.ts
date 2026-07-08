import { NextResponse } from "next/server";
import { extractRecipeFromInstagramText } from "@/lib/admin/instagram-recipe-extractor";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  let body: { texto?: string };
  try {
    body = (await request.json()) as { texto?: string };
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const texto = typeof body.texto === "string" ? body.texto : "";
  if (!texto.trim()) {
    return NextResponse.json(
      { error: "Pega la descripción del post de Instagram." },
      { status: 400 }
    );
  }

  try {
    const recipe = await extractRecipeFromInstagramText(texto);
    return NextResponse.json({ recipe });
  } catch (error) {
    console.error("[admin/structure-instagram-recipe]", error);
    const message =
      error instanceof Error ? error.message : "No pudimos estructurar la receta con Gemini.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
