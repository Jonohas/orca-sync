import { watch } from "fs";
import { pathBase } from "./config.ts";
import { addToQueue as realAddToQueue } from "./queue.ts";
import { isJsonFile } from "./utils.ts";
import { join } from "path";
import { logger } from "./logger.ts";

// Allow tests to inject a mock for addToQueue without relying on vi.mock
let addToQueueFn: typeof realAddToQueue = realAddToQueue;
export function __setAddToQueueForTest(fn: typeof realAddToQueue) {
  addToQueueFn = fn;
}

export function __handleEventForTest(folder: string, event: string, file?: string | Buffer) {
  if (!file) return;
  const filename = typeof file === "string" ? file : file.toString();
  const relativePath = `${folder}/${filename}`;
  if (!isJsonFile(filename)) {
    return;
  }
  logger.info(`JSON file ${event}: ${relativePath}`);
  addToQueueFn(relativePath);
}

export const createWatcher = (folder: string) => {
  return watch(join(pathBase, folder), async (event, file) => {
    __handleEventForTest(folder, String(event), file as any);
  });
};
