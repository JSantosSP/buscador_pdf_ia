import { NextRequest, NextResponse } from "next/server";
import { semanticSearch } from "@/lib/search";
import { askWithContext } from "@/lib/rag";
import fs from "fs";
import path from "path";

// Función para obtener el resumen asociado al archivo de embeddings
function getSummaryForDocument(embeddingsFile: string): string | null {
  try {
    // Extraer el timestamp del archivo de embeddings para encontrar el resumen correspondiente
    const timestampMatch = embeddingsFile.match(/(\d+)-/);
    if (!timestampMatch) return null;
    
    const timestamp = timestampMatch[1];
    const summariesDir = path.join(process.cwd(), "data", "summaries");
    
    // Buscar archivos de resumen con el mismo timestamp
    if (!fs.existsSync(summariesDir)) return null;
    
    const summaryFiles = fs.readdirSync(summariesDir);
    const matchingSummary = summaryFiles.find(file => file.startsWith(`summary-${timestamp}-`));
    
    if (matchingSummary) {
      const summaryPath = path.join(summariesDir, matchingSummary);
      return fs.readFileSync(summaryPath, "utf-8");
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo resumen:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, embeddingsFile } = await req.json();
    if (!query || !embeddingsFile) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // 1️⃣ Buscar chunks relevantes
    const results = await semanticSearch(query, embeddingsFile, 3);

    // 2️⃣ Obtener el resumen del documento (opcional)
    const summary = getSummaryForDocument(embeddingsFile);

    // 3️⃣ Preguntar al modelo usando el contexto
    const answer = await askWithContext(query, results, summary);

    return NextResponse.json({ 
      answer, 
      context: results,
      hasSummary: !!summary,
      summary: summary
    });
  } catch (err) {
    console.error("Ask error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}