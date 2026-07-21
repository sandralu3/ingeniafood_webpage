import { NextResponse } from "next/server";
import {
  deleteAdminUser,
  updateUserDailyScanLimit,
  updateUserPremiumStatus,
  updateUserTesterStatus
} from "@/lib/admin/users-admin";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PatchBody = {
  dailyScanLimit?: number;
  isPremium?: boolean;
  isTester?: boolean;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const hasScanLimit = typeof body.dailyScanLimit === "number";
  const hasPremium = typeof body.isPremium === "boolean";
  const hasTester = typeof body.isTester === "boolean";

  if (!hasScanLimit && !hasPremium && !hasTester) {
    return NextResponse.json(
      {
        error: "Debes indicar dailyScanLimit, isPremium o isTester."
      },
      { status: 400 }
    );
  }

  try {
    let user;
    if (hasScanLimit) {
      user = await updateUserDailyScanLimit(id, body.dailyScanLimit!);
    }
    if (hasPremium) {
      user = await updateUserPremiumStatus(id, body.isPremium!);
    }
    if (hasTester) {
      user = await updateUserTesterStatus(id, body.isTester!);
    }

    if (!user) {
      return NextResponse.json({ error: "No se pudo actualizar el usuario." }, { status: 400 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[admin/users/:id] PATCH", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No pudimos actualizar el usuario."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  try {
    const deletedUser = await deleteAdminUser(id, { requesterUserId: auth.user.id });
    return NextResponse.json({ deletedUser });
  } catch (error) {
    console.error("[admin/users/:id] DELETE", error);
    const message = error instanceof Error ? error.message : "No pudimos eliminar el usuario.";
    const isClientError =
      error instanceof Error &&
      /No se puede|No puedes|No se encontró|Debes indicar/.test(message);

    return NextResponse.json({ error: message }, { status: isClientError ? 400 : 500 });
  }
}
