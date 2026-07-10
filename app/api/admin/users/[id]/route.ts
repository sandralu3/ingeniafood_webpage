import { NextResponse } from "next/server";
import { updateUserDailyScanLimit } from "@/lib/admin/users-admin";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  let body: { dailyScanLimit?: number };
  try {
    body = (await request.json()) as { dailyScanLimit?: number };
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  if (typeof body.dailyScanLimit !== "number") {
    return NextResponse.json({ error: "Debes indicar dailyScanLimit." }, { status: 400 });
  }

  try {
    const user = await updateUserDailyScanLimit(id, body.dailyScanLimit);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[admin/users/:id] PATCH", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No pudimos actualizar el límite diario."
      },
      { status: 500 }
    );
  }
}
