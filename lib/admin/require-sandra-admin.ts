import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isSandraAdmin } from "@/lib/auth/sandra-admin";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";

type SandraAdminContext = {
  user: User;
};

type SandraAdminResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

export async function requireSandraAdmin(): Promise<SandraAdminResult> {
  const supabase = await createSupabaseRouteClient();

  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Supabase no está configurado correctamente." }, { status: 500 })
    };
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 })
    };
  }

  if (!isSandraAdmin(user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Acceso restringido a administración." }, { status: 403 })
    };
  }

  return { ok: true, user };
}

export type { SandraAdminContext };
