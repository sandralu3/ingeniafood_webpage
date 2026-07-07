import { NextResponse } from "next/server";
import { normalizeInstagramUrl } from "@/lib/recipes/instagram-url";

type OEmbedResponse = {
  title?: string;
  thumbnail_url?: string;
  author_name?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Falta el parámetro url." }, { status: 400 });
  }

  const normalizedUrl = normalizeInstagramUrl(rawUrl);
  if (!normalizedUrl) {
    return NextResponse.json({ error: "URL de Instagram no válida." }, { status: 400 });
  }

  try {
    const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(normalizedUrl)}&maxwidth=640`;
    const response = await fetch(oembedUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "IngeniaFood/1.0"
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      return NextResponse.json({
        title: null,
        thumbnailUrl: null,
        authorName: null
      });
    }

    const payload = (await response.json()) as OEmbedResponse;
    return NextResponse.json({
      title: payload.title ?? null,
      thumbnailUrl: payload.thumbnail_url ?? null,
      authorName: payload.author_name ?? null
    });
  } catch (error) {
    console.error("[instagram-metadata] Error obteniendo oEmbed:", error);
    return NextResponse.json({
      title: null,
      thumbnailUrl: null,
      authorName: null
    });
  }
}
