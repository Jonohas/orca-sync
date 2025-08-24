import { extname } from "path";
import { logger } from "./logger.ts";

export function isJsonFile(filePath: string): boolean {
  return extname(filePath).toLowerCase() === ".json";
}

export async function getFileHash(filePath: string): Promise<string> {
  try {
    const file = Bun.file(filePath);
    const buffer = await file.arrayBuffer();
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(buffer);
    return hasher.digest("hex");
  } catch (error) {
    logger.error(`Error getting hash for ${filePath}:`, error);
    return "";
  }
}
