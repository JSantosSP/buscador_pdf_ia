import { NextRequest, NextResponse } from "next/server";
import { semanticSearch } from "@/lib/search";

export async function POST(req: NextRequest) {
  try {
    const { query, embeddingsFile } = await req.json();

    if (!query || !embeddingsFile) {
      return NextResponse.json(
        { error: "Faltan parámetros: query y embeddingsFile son obligatorios" },
        { status: 400 }
      );
    }

    const results = await semanticSearch(query, embeddingsFile, 3);

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Error interno en búsqueda" }, { status: 500 });
  }
}
