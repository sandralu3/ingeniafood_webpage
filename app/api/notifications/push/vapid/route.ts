import { NextResponse } from "next/server";
import { getVapidPublicKey, isWebPushConfigured } from "@/lib/notifications/web-push-config";

export async function GET() {
  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { configured: false, publicKey: null },
      { status: 200 }
    );
  }

  return NextResponse.json({
    configured: true,
    publicKey: getVapidPublicKey()
  });
}
