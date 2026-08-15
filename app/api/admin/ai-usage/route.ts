import { NextResponse } from "next/server";
import { requireSandraAdmin } from "@/lib/admin/require-sandra-admin";
import { fetchAdminAiUsageReport } from "@/lib/admin/ai-usage-stats";

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireSandraAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const report = await fetchAdminAiUsageReport({
      fromDate: searchParams.get("from") ?? undefined,
      toDate: searchParams.get("to") ?? undefined,
      selectedDate: searchParams.get("date") ?? undefined
    });
    return NextResponse.json(report);
  } catch (error) {
    console.error("[admin/ai-usage] GET", error);
    const message =
      error instanceof Error ? error.message : "No pudimos cargar el uso de IA.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
