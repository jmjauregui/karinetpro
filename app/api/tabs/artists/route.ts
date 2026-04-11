import { NextRequest } from "next/server";
import * as cheerio from "cheerio";

const BASE_URL = "https://gprotab.net";

export async function GET(request: NextRequest) {
  const letter = request.nextUrl.searchParams.get("letter");

  if (!letter || !/^[a-z0-9]$/i.test(letter)) {
    return Response.json(
      { error: "Parametro 'letter' requerido (a-z)" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${BASE_URL}/en/artists/${letter.toLowerCase()}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KarinetPro/1.0; educational)",
      },
    });

    if (!res.ok) {
      return Response.json(
        { error: `Error al obtener artistas: ${res.status}` },
        { status: 502 },
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const artists: { name: string; slug: string; image: string | null }[] = [];

    $("ul li").each((_, el) => {
      const link = $(el).find("a");
      const href = link.attr("href");
      const name = link.text().trim();
      const img = $(el).find("img").attr("src") || null;

      if (href && href.startsWith("/en/tabs/") && name) {
        const slug = href.replace("/en/tabs/", "");
        artists.push({
          name,
          slug,
          image: img ? (img.startsWith("http") ? img : `${BASE_URL}${img}`) : null,
        });
      }
    });

    return Response.json({ letter: letter.toLowerCase(), artists });
  } catch (err) {
    return Response.json(
      { error: `Error de conexion: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
