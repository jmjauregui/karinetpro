import { NextRequest } from "next/server";
import * as cheerio from "cheerio";

const BASE_URL = "https://gprotab.net";

export async function GET(request: NextRequest) {
  const artist = request.nextUrl.searchParams.get("artist");

  if (!artist) {
    return Response.json(
      { error: "Parametro 'artist' requerido (slug del artista)" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${BASE_URL}/en/tabs/${encodeURIComponent(artist)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KarinetPro/1.0; educational)",
      },
    });

    if (!res.ok) {
      return Response.json(
        { error: `Error al obtener canciones: ${res.status}` },
        { status: 502 },
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const songs: { name: string; slug: string }[] = [];

    $("ul li a").each((_, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();

      if (href && href.startsWith(`/en/tabs/${artist}/`) && name) {
        const slug = href.replace(`/en/tabs/${artist}/`, "");
        songs.push({ name, slug });
      }
    });

    return Response.json({ artist, songs });
  } catch (err) {
    return Response.json(
      { error: `Error de conexion: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
