import { watch, openSync } from "fs";
import { homedir } from "os";
import { readdir, stat } from "fs/promises";
import { join, extname } from "path";
import { type S3File } from "bun";

interface SyncEvent {
    filePath: string;
    timestamp: number;
    retries: number;
}

interface FileInfo {
    path: string;
    modTime: number;
    hash: string;
    size: number;
}

const client = new Bun.S3Client({
    accessKeyId: Bun.env.MINIO_ACCESS_KEY,
    secretAccessKey: Bun.env.MINIO_SECRET_KEY,
    bucket: Bun.env.MINIO_BUCKET_NAME,
    region: "eu-west-hetzner",
    endpoint: "minio.hagenfaber.eu", // MinIO
});

const foldersToWatch = ["filament", "machine", "process"];
const path = `${homedir()}/AppData/Roaming/OrcaSlicer/user/default`;

// Queue-based event management with deduplication
const syncQueue = new Map<string, SyncEvent>();
const DEBOUNCE_DELAY = 500; // ms
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Utility function to check if file is JSON
function isJsonFile(filePath: string): boolean {
    return extname(filePath).toLowerCase() === '.json';
}

// Utility functions
async function getFileHash(filePath: string): Promise<string> {
    try {
        const file = Bun.file(filePath);
        const buffer = await file.arrayBuffer();
        const hasher = new Bun.CryptoHasher("sha256");
        hasher.update(buffer);
        return hasher.digest("hex");
    } catch (error) {
        console.error(`Error getting hash for ${filePath}:`, error);
        return "";
    }
}

async function getLocalFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
        const stats = await stat(filePath);
        const hash = await getFileHash(filePath);
        return {
            path: filePath,
            modTime: stats.mtime.getTime(),
            hash,
            size: stats.size
        };
    } catch (error) {
        console.error(`Error getting local file info for ${filePath}:`, error);
        return null;
    }
}

async function getS3FileInfo(s3Key: string): Promise<FileInfo | null> {
    try {
        const s3File = client.file(s3Key);
        if (!(await s3File.exists())) {
            return null;
        }

        const stats = await s3File.stat();
        // S3 ETag serves as a hash (for simple uploads)
        const hash = stats.etag?.replace(/"/g, '') || "";

        return {
            path: s3Key,
            modTime: stats.lastModified?.getTime() || 0,
            hash,
            size: stats.size || 0
        };
    } catch (error) {
        console.error(`Error getting S3 file info for ${s3Key}:`, error);
        return null;
    }
}

async function getAllLocalFiles(): Promise<string[]> {
    const allFiles: string[] = [];

    for (const folder of foldersToWatch) {
        const folderPath = join(path, folder);
        try {
            const files = await readdir(folderPath);
            for (const file of files) {
                // Only include JSON files
                if (isJsonFile(file)) {
                    allFiles.push(`${folder}/${file}`);
                }
            }
        } catch (error) {
            console.error(`Error reading folder ${folder}:`, error);
        }
    }

    return allFiles;
}

async function getAllS3Files(): Promise<string[]> {
    // Note: This is a simplified version. In practice, you'd need to list S3 objects
    // For now, we'll assume S3 files match the structure we're watching
    const s3Files: string[] = [];

    for (const folder of foldersToWatch) {
        try {
            // This would need proper S3 listing implementation
            // Filter for JSON files only when implementing S3 listing
            console.log(`Would list JSON files in S3 ${folder}/`);
        } catch (error) {
            console.error(`Error listing S3 files in ${folder}:`, error);
        }
    }

    return s3Files;
}

async function syncFile(relativePath: string): Promise<boolean> {
    // Skip non-JSON files
    if (!isJsonFile(relativePath)) {
        console.log(`Skipping non-JSON file: ${relativePath}`);
        return true;
    }

    const localPath = join(path, relativePath);
    const localInfo = await getLocalFileInfo(localPath);
    const s3Info = await getS3FileInfo(relativePath);

    try {
        // Case 1: Local file doesn't exist (cleanup S3)
        if (!localInfo && s3Info) {
            console.log(`Deleting S3 file: ${relativePath}`);
            const s3File = client.file(relativePath);
            await s3File.delete();
            return true;
        }

        // Case 2: Local file exists, S3 doesn't (upload)
        if (localInfo && !s3Info) {
            console.log(`Uploading new JSON file: ${relativePath}`);
            const s3File = client.file(relativePath);
            const bunFile = Bun.file(localPath);
            await s3File.write(bunFile);
            return true;
        }

        // Case 3: Both exist, check if sync needed (local-first strategy)
        if (localInfo && s3Info) {
            // Compare hash first (most reliable), then timestamp as fallback
            const needsSync = localInfo.hash !== s3Info.hash ||
                localInfo.modTime > s3Info.modTime;

            if (needsSync) {
                console.log(`Updating S3 JSON file: ${relativePath}`);
                const s3File = client.file(relativePath);
                const bunFile = Bun.file(localPath);
                await s3File.write(bunFile);
                return true;
            } else {
                console.log(`JSON file up to date: ${relativePath}`);
                return true;
            }
        }

        return true;
    } catch (error) {
        console.error(`Error syncing JSON file ${relativePath}:`, error);
        return false;
    }
}

async function processQueue() {
    const events = Array.from(syncQueue.values());
    syncQueue.clear();

    for (const event of events) {
        const success = await syncFile(event.filePath);

        if (!success && event.retries < MAX_RETRIES) {
            // Retry with exponential backoff
            setTimeout(() => {
                syncQueue.set(event.filePath, {
                    ...event,
                    retries: event.retries + 1,
                    timestamp: Date.now()
                });
                setTimeout(processQueue, RETRY_DELAY * Math.pow(2, event.retries));
            }, RETRY_DELAY * Math.pow(2, event.retries));
        }
    }
}

function addToQueue(filePath: string) {
    // Only add JSON files to queue
    if (!isJsonFile(filePath)) {
        console.log(`Ignoring non-JSON file: ${filePath}`);
        return;
    }

    syncQueue.set(filePath, {
        filePath,
        timestamp: Date.now(),
        retries: 0
    });

    // Debounced processing
    setTimeout(() => {
        if (syncQueue.has(filePath)) {
            processQueue();
        }
    }, DEBOUNCE_DELAY);
}

async function initialSync() {
    console.log("Starting initial sync (JSON files only)...");

    try {
        const localFiles = await getAllLocalFiles();
        const s3Files = await getAllS3Files();

        // Sync all local JSON files
        for (const file of localFiles) {
            await syncFile(file);
        }

        // Clean up S3 JSON files that don't exist locally
        for (const file of s3Files) {
            if (isJsonFile(file)) {
                const localPath = join(path, file);
                try {
                    await stat(localPath);
                } catch {
                    // File doesn't exist locally, delete from S3
                    console.log(`Cleaning up S3 JSON file: ${file}`);
                    const s3File = client.file(file);
                    await s3File.delete();
                }
            }
        }

        console.log("Initial sync completed (JSON files only)");
    } catch (error) {
        console.error("Error during initial sync:", error);
    }
}

const createWatcher = (folder: string) => {
    return watch(`${path}/${folder}`, async (event, file) => {
        if (!file) return;

        const relativePath = `${folder}/${file}`;

        // Only process JSON files
        if (!isJsonFile(file)) {
            return;
        }

        console.log(`JSON file ${event}: ${relativePath}`);

        // Add to queue for debounced processing
        addToQueue(relativePath);
    });
}

// Start initial sync, then set up watchers
async function start() {
    await initialSync();

    const watchers = foldersToWatch.map(createWatcher);

    process.on("SIGINT", () => {
        console.log("Closing watchers...");
        for (const watcher of watchers) {
            watcher.close();
        }
        process.exit(0);
    });

    console.log(`Watching folders for JSON files: ${foldersToWatch.join(', ')}`);
}

// Start the application
start().catch(console.error);