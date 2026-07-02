import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function getGenerationsLeft(userId: string): Promise<number | null> {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("generations_left")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.generations_left;
  } catch {
    return null;
  }
}

export async function consumeGeneration(userId: string): Promise<number | null> {
  try {
    const admin = getSupabaseAdminClient();
    const { data: profile, error: readError } = await admin
      .from("profiles")
      .select("generations_left")
      .eq("id", userId)
      .maybeSingle();

    if (readError || !profile || profile.generations_left <= 0) {
      return null;
    }

    const nextValue = profile.generations_left - 1;
    const { data: updated, error: updateError } = await admin
      .from("profiles")
      .update({ generations_left: nextValue })
      .eq("id", userId)
      .eq("generations_left", profile.generations_left)
      .select("generations_left")
      .maybeSingle();

    if (updateError || !updated) {
      return null;
    }

    return updated.generations_left;
  } catch {
    return null;
  }
}
