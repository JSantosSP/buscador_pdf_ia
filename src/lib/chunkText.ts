import fs from "fs";
import path from "path";

interface Chunk {
  id: string;
  filename: string;
  chunkIndex: number;
  content: string;
}

export function chunkTextFromFile(rawFilePath: string, chunkSize = 800): Chunk[] {
  const filename = path.basename(rawFilePath);
  const rawText = fs.readFileSync(rawFilePath, "utf-8");

  const chunks: Chunk[] = [];
  let index = 0;

  for (let i = 0; i < rawText.length; i += chunkSize) {
    const chunk = rawText.slice(i, i + chunkSize).trim();
    if (chunk) {
      chunks.push({
        id: `${filename}-${index}`,
        filename,
        chunkIndex: index,
        content: chunk,
      });
      index++;
    }
  }

  return chunks;
}

export function saveChunks(chunks: Chunk[]) {
  const chunksDir = path.join(process.cwd(), "data", "chunks");
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }

  const filename = chunks[0]?.filename.replace(".txt", "") || `chunks-${Date.now()}`;
  const outputPath = path.join(chunksDir, `${filename}.json`);

  fs.writeFileSync(outputPath, JSON.stringify(chunks, null, 2), "utf-8");

  return outputPath;
}
