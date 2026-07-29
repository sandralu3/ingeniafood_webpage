import { createSupabaseClient } from "@/lib/supabaseClient";

/**
 * Uploads the user's plate photo for an out-of-home meal.
 * Uses the avatars bucket under the user's folder (same ACL pattern as profile).
 */
export async function uploadExternalMealPhoto(
  userId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const supabase = createSupabaseClient();
  const mime = file.type || "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const filePath = `${userId}/external-meals/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
    upsert: false,
    cacheControl: "3600",
    contentType: mime
  });

  if (uploadError) {
    console.error("[external-meal] photo upload failed", uploadError);
    return { error: "No pudimos guardar la foto del plato. Inténtalo de nuevo." };
  }

  const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return { url: `${publicData.publicUrl}?t=${Date.now()}` };
}
