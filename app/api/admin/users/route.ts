import { NextResponse } from "next/server";
import { listAdminUsers } from "@/lib/admin/users-admin";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";

export async function GET() {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const users = await listAdminUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[admin/users] GET", error);
    const message =
      error instanceof Error ? error.message : "No pudimos cargar la lista de usuarios.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
