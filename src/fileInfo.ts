import { stat } from "fs/promises";
import { getFileHash } from "./utils.ts";
import { s3Client } from "./s3.ts";
import type { FileInfo } from "./types.ts";
import { logger } from "./logger.ts";

export async function getLocalFileInfo(filePath: string): Promise<FileInfo | null> {
  try {
    const stats = await stat(filePath);
    const hash = await getFileHash(filePath);
    return {
      path: filePath,
      modTime: stats.mtime.getTime(),
      hash,
      size: stats.size,
    };
  } catch (error) {
    logger.error(`Error getting local file info for ${filePath}:`, error);
    return null;
  }
}

export async function getS3FileInfo(s3Key: string): Promise<FileInfo | null> {
  try {
    const s3File = s3Client.file(s3Key);
    if (!(await s3File.exists())) {
      return null;
    }

    const stats = await s3File.stat();
    const hash = stats.etag?.replace(/"/g, "") || "";

    return {
      path: s3Key,
      modTime: stats.lastModified?.getTime() || 0,
      hash,
      size: stats.size || 0,
    };
  } catch (error) {
    logger.error(`Error getting S3 file info for ${s3Key}:`, error);
    return null;
  }
}
