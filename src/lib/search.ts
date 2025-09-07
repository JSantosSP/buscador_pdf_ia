import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";
import { cosineSimilarity } from "./similarity";

interface EmbeddedChunk {
  id: string;
  filename: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}

let embedder: any = null;

async function loadEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2");
  }
  return embedder;
}

export async function semanticSearch(
  query: string,
  embeddingsFile: string,
  topK = 3
) {
  // 1. Cargar chunks embebidos
  const filePath = path.join(process.cwd(), "data", "embeddings", embeddingsFile);
  const data: EmbeddedChunk[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // 2. Embedding de la query
  const embedder = await loadEmbedder();
  const output = await embedder(query, { pooling: "mean", normalize: true });
  const queryEmbedding: number[]  = Array.from(output.data);

  // 3. Calcular similitud con cada chunk
  const scored = data.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // 4. Ordenar por score descendente y devolver topK
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}
