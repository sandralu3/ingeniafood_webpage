import { NextResponse } from "next/server";

import { getUserPremiumAccess } from "@/lib/auth/user-premium";

import { createSupabaseRouteClient } from "@/lib/supabaseRoute";



type RequirePremiumOk = {

  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseRouteClient>>>;

  userId: string;

};



export async function requirePremium(): Promise<RequirePremiumOk | NextResponse> {

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



  const { access, error } = await getUserPremiumAccess(supabase, user.id, user.email);

  if (error) {

    return NextResponse.json({ error }, { status: 503 });

  }



  if (!access.canUsePremiumFeatures) {

    return NextResponse.json(

      { error: "Esta es una característica Premium." },

      { status: 403 }

    );

  }



  return { supabase, userId: user.id };

}


