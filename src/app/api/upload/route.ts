import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Usar pdf-parse para mejor compatibilidad con Node.js
import pdf from "pdf-parse";
import { chunkTextFromFile, saveChunks } from "@/lib/chunkText";
import { generateEmbeddingsFromChunks } from "@/lib/embeddings";
import { generateSummary } from "@/lib/summary"; // Nueva importación

async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  try {
    const pdfBuffer = Buffer.from(buffer);
    const data = await pdf(pdfBuffer, {
      // Opciones para mejorar la extracción
      max: 0, // Máximo número de páginas (0 = todas)
      version: 'v1.10.100' // Versión de PDF.js interna
    });
    
    return data.text.trim();
  } catch (error) {
    console.error('Error extrayendo texto del PDF:', error);
    throw new Error('Error al procesar el archivo PDF');
  }
}

async function extractTextFromMarkdown(buffer: ArrayBuffer): Promise<string> {
  try {
    return Buffer.from(buffer).toString("utf-8");
  } catch (error) {
    console.error('Error extrayendo texto del Markdown:', error);
    throw new Error('Error al procesar el archivo Markdown');
  }
}

async function extractTextFromPlainText(buffer: ArrayBuffer): Promise<string> {
  try {
    return Buffer.from(buffer).toString("utf-8");
  } catch (error) {
    console.error('Error extrayendo texto plano:', error);
    throw new Error('Error al procesar el archivo de texto');
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se ha subido ningún archivo" }, 
        { status: 400 }
      );
    }

    // Validar tamaño del archivo (máximo 10MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande (máximo 20MB)" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    let textContent = "";

    // Procesar según el tipo de archivo
    try {
      switch (file.type) {
        case "application/pdf":
          textContent = await extractTextFromPdf(buffer);
          break;
          
        case "text/markdown":
        case "text/x-markdown":
          textContent = await extractTextFromMarkdown(buffer);
          break;
          
        case "text/plain":
          textContent = await extractTextFromPlainText(buffer);
          break;
          
        default:
          // Intentar como texto plano si el tipo MIME no es reconocido
          if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            textContent = await extractTextFromPlainText(buffer);
          } else {
            return NextResponse.json(
              { error: `Tipo de archivo no soportado: ${file.type}` },
              { status: 400 }
            );
          }
      }
    } catch (extractionError) {
      console.error('Error en extracción:', extractionError);
      return NextResponse.json(
        { 
          error: extractionError instanceof Error 
            ? extractionError.message 
            : "Error al procesar el archivo"
        },
        { status: 400 }
      );
    }

    // Validar que se extrajo contenido
    if (!textContent || !textContent.trim()) {
      return NextResponse.json(
        { error: "No se pudo extraer texto del archivo o el archivo está vacío" },
        { status: 400 }
      );
    }

    // Crear directorios si no existen
    const rawDir = path.join(process.cwd(), "data", "raw");
    const summariesDir = path.join(process.cwd(), "data", "summaries");
    
    try {
      if (!fs.existsSync(rawDir)) {
        fs.mkdirSync(rawDir, { recursive: true });
      }
      if (!fs.existsSync(summariesDir)) {
        fs.mkdirSync(summariesDir, { recursive: true });
      }
    } catch (dirError) {
      console.error('Error creando directorios:', dirError);
      return NextResponse.json(
        { error: "Error interno del servidor" },
        { status: 500 }
      );
    }

    // Generar nombre de archivo seguro
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${safeName}.txt`;
    const filePath = path.join(rawDir, filename);

    // Guardar archivo
    try {
      fs.writeFileSync(filePath, textContent, "utf-8");
    } catch (writeError) {
      console.error('Error escribiendo archivo:', writeError);
      return NextResponse.json(
        { error: "Error guardando el archivo" },
        { status: 500 }
      );
    }

    // *** NUEVA SECCIÓN: Generar resumen ***
    let summary = "";
    let summaryPath = "";
    
    try {
      console.log("Generando resumen con Ollama...");
      summary = await generateSummary(textContent);
      
      // Guardar el resumen en un archivo
      const summaryFilename = `summary-${timestamp}-${safeName}.txt`;
      summaryPath = path.join(summariesDir, summaryFilename);
      fs.writeFileSync(summaryPath, summary, "utf-8");
      
      console.log(`Resumen generado y guardado en: ${summaryPath}`);
      
    } catch (summaryError) {
      console.error('Error generando resumen:', summaryError);
      // No fallar completamente, solo registrar el error
    }

    // Procesar chunks del texto extraído
    let chunkPath = "";
    let totalChunks = 0;
    
    try {
      // Crear chunks del texto extraído
      const chunks = chunkTextFromFile(filePath, 1200);
      totalChunks = chunks.length;
      
      // Guardar chunks en archivo JSON
      chunkPath = saveChunks(chunks);
      
      console.log(`Archivo procesado: ${chunks.length} chunks creados en ${chunkPath}`);
      
    } catch (chunkError) {
      console.error('Error procesando chunks:', chunkError);
    }

    // Generar embeddings
    let embeddingsPath = "";
    try{
      // Generamos embeddings (open-source con transformers.js)
      embeddingsPath = await generateEmbeddingsFromChunks(chunkPath);
    }catch(embeddingError){
      console.error('Error generando embeddings:', embeddingError);
    }

    // Respuesta exitosa con información completa
    return NextResponse.json({
      success: true,
      filename,
      fileSize: file.size,
      extractedLength: textContent.length,
      fileType: file.type,
      // Información de chunks
      chunksCreated: totalChunks,
      chunkPath: chunkPath ? path.basename(chunkPath) : null,
      rawFilePath: filename,
      // Información de embeddings
      embeddingsFile: embeddingsPath ? path.basename(embeddingsPath) : null,
      // Nueva información de resumen
      summaryGenerated: !!summary,
      summaryPath: summaryPath ? path.basename(summaryPath) : null,
      summary: summary || null, // Incluir el resumen en la respuesta
      summaryLength: summary ? summary.length : 0
    });

  } catch (error) {
    console.error("Error general en upload:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}