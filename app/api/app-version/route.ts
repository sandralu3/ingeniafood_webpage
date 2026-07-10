import { getAppVersion } from "@/lib/app-version";

export async function GET() {
  return Response.json(
    { version: getAppVersion() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    }
  );
}
