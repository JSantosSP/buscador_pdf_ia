import fs from "fs";
import path from "path";
import { pipeline } from "@xenova/transformers";

interface Chunk {
  id: string;
  filename: string;
  chunkIndex: number;
  content: string;
}

interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

let embedder: any = null;

async function loadEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2");
  }
  return embedder;
}

export async function generateEmbeddingsFromChunks(
  chunkFilePath: string
): Promise<string> {
  const rawData = fs.readFileSync(chunkFilePath, "utf-8");
  const chunks: Chunk[] = JSON.parse(rawData);

  const embedder = await loadEmbedder();
  const embeddedChunks: EmbeddedChunk[] = [];

  for (const chunk of chunks) {
    const output = await embedder(chunk.content, { pooling: "mean", normalize: true });
    embeddedChunks.push({
      ...chunk,
      embedding: Array.from(output.data),
    });
  }

  // Guardar embeddings
  const embeddingsDir = path.join(process.cwd(), "data", "embeddings");
  if (!fs.existsSync(embeddingsDir)) {
    fs.mkdirSync(embeddingsDir, { recursive: true });
  }

  const outputFile = path.join(
    embeddingsDir,
    path.basename(chunkFilePath).replace(".json", "-embeddings.json")
  );

  fs.writeFileSync(outputFile, JSON.stringify(embeddedChunks, null, 2), "utf-8");

  return outputFile;
}
