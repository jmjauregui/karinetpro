import { NextRequest } from "next/server";

const BASE_URL = "https://gprotab.net";

export async function GET(request: NextRequest) {
  const artist = request.nextUrl.searchParams.get("artist");
  const song = request.nextUrl.searchParams.get("song");

  if (!artist || !song) {
    return Response.json(
      { error: "Parametros 'artist' y 'song' requeridos" },
      { status: 400 },
    );
  }

  try {
    const url = `${BASE_URL}/en/tabs/${encodeURIComponent(artist)}/${encodeURIComponent(song)}?download`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KarinetPro/1.0; educational)",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return Response.json(
        { error: `Error al descargar tab: ${res.status}` },
        { status: 502 },
      );
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "application/octet-stream";

    // Try to extract filename from content-disposition or build one
    const disposition = res.headers.get("content-disposition");
    let fileName = `${artist}-${song}.gp`;
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)/);
      if (match?.[1]) fileName = match[1];
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    return Response.json(
      { error: `Error de conexion: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
