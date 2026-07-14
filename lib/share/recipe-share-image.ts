import type { RecipeMacros } from "@/lib/recipes/recipe-macros";

export type ShareableRecipe = {
  titulo: string;
  tiempo_preparacion: string;
  ingredientes_detallados: string[];
  pasos_ordenados?: string[];
  tip_sandra?: string;
  tags?: string[];
  macronutrientes?: RecipeMacros | null;
  imageUrl?: string | null;
  referenceImageUrl?: string | null;
};

function slugifyRecipeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function buildRecipeImageFilename(title: string): string {
  const slug = slugifyRecipeTitle(title) || "receta";
  return `receta-${slug}.png`;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  if (!base64) {
    throw new Error("No se pudo convertir la imagen generada.");
  }
  const mimeMatch = header.match(/data:(.*?);/);
  const mime = mimeMatch?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function shareOrDownloadRecipePng(
  dataUrl: string,
  recipeTitle: string
): Promise<"shared" | "downloaded"> {
  const filename = buildRecipeImageFilename(recipeTitle);
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], filename, { type: "image/png" });

  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));

  if (canShareFiles) {
    await navigator.share({
      files: [file],
      title: recipeTitle,
      text: "Receta generada con IngeniaFood"
    });
    return "shared";
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
  return "downloaded";
}

