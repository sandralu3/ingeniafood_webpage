import { createClient } from "@supabase/supabase-js";
import { fetchInstagramCatalogRecipes } from "@/lib/recipes/instagram-catalog";
import { getSupabaseProjectUrl } from "@/lib/supabaseConfig";
import type { Database } from "@/types/database.types";

export async function GET() {
  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ recipes: [] }, { status: 503 });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const recipes = await fetchInstagramCatalogRecipes(supabase);

  return Response.json(
    { recipes },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
      }
    }
  );
}
