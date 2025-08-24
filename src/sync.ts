import { readdir, stat } from "fs/promises";
import { join } from "path";
import { foldersToWatch, pathBase } from "./config.ts";
import { isJsonFile } from "./utils.ts";
import { getLocalFileInfo, getS3FileInfo } from "./fileInfo.ts";
import { s3Client } from "./s3.ts";
import { logger } from "./logger.ts";

async function getAllLocalFiles(): Promise<string[]> {
  const allFiles: string[] = [];

  for (const folder of foldersToWatch) {
    const folderPath = join(pathBase, folder);
    try {
      const files = await readdir(folderPath);
      for (const file of files) {
        if (isJsonFile(file)) {
          allFiles.push(`${folder}/${file}`);
        }
      }
    } catch (error) {
      logger.error(`Error reading folder ${folder}:`, error);
    }
  }

  return allFiles;
}

async function getAllS3Files(): Promise<string[]> {
  // Placeholder: replace with S3 listObjects when needed
  const s3Files: string[] = [];
  for (const folder of foldersToWatch) {
    try {
      logger.info(`Would list JSON files in S3 ${folder}/`);
    } catch (error) {
      logger.error(`Error listing S3 files in ${folder}:`, error);
    }
  }
  return s3Files;
}

export async function syncFile(relativePath: string): Promise<boolean> {
  if (!isJsonFile(relativePath)) {
    logger.info(`Skipping non-JSON file: ${relativePath}`);
    return true;
  }

  const localPath = join(pathBase, relativePath);
  const localInfo = await getLocalFileInfo(localPath);
  const s3Info = await getS3FileInfo(relativePath);

  try {
    if (!localInfo && s3Info) {
      logger.info(`Deleting S3 file: ${relativePath}`);
      const s3File = s3Client.file(relativePath);
      await s3File.delete();
      return true;
    }

    if (localInfo && !s3Info) {
      logger.info(`Uploading new JSON file: ${relativePath}`);
      const s3File = s3Client.file(relativePath);
      const bunFile = Bun.file(localPath);
      await s3File.write(bunFile);
      return true;
    }

    if (localInfo && s3Info) {
      const needsSync = localInfo.hash !== s3Info.hash || localInfo.modTime > s3Info.modTime;

      if (needsSync) {
        logger.info(`Updating S3 JSON file: ${relativePath}`);
        const s3File = s3Client.file(relativePath);
        const bunFile = Bun.file(localPath);
        await s3File.write(bunFile);
        return true;
      } else {
        logger.info(`JSON file up to date: ${relativePath}`);
        return true;
      }
    }

    return true;
  } catch (error) {
    logger.error(`Error syncing JSON file ${relativePath}:`, error);
    return false;
  }
}

export async function initialSync() {
  logger.info("Starting initial sync (JSON files only)...");

  try {
    const localFiles = await getAllLocalFiles();
    const s3Files = await getAllS3Files();

    for (const file of localFiles) {
      await syncFile(file);
    }

    for (const file of s3Files) {
      if (isJsonFile(file)) {
        const localPath = join(pathBase, file);
        try {
          await stat(localPath);
        } catch {
          logger.info(`Cleaning up S3 JSON file: ${file}`);
          const s3File = s3Client.file(file);
          await s3File.delete();
        }
      }
    }

    logger.info("Initial sync completed (JSON files only)");
  } catch (error) {
    logger.error("Error during initial sync:", error);
  }
}
