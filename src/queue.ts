import { DEBOUNCE_DELAY, MAX_RETRIES, RETRY_DELAY } from "./config.ts";
import { isJsonFile } from "./utils.ts";
import { syncFile } from "./sync.ts";
import type { SyncEvent } from "./types.ts";

export const syncQueue = new Map<string, SyncEvent>();

export async function processQueue() {
  const events = Array.from(syncQueue.values());
  syncQueue.clear();

  for (const event of events) {
    const success = await syncFile(event.filePath);

    if (!success && event.retries < MAX_RETRIES) {
      setTimeout(() => {
        syncQueue.set(event.filePath, {
          ...event,
          retries: event.retries + 1,
          timestamp: Date.now(),
        });
        setTimeout(processQueue, RETRY_DELAY * Math.pow(2, event.retries));
      }, RETRY_DELAY * Math.pow(2, event.retries));
    }
  }
}

export function addToQueue(filePath: string) {
  if (!isJsonFile(filePath)) {
    console.log(`Ignoring non-JSON file: ${filePath}`);
    return;
  }

  syncQueue.set(filePath, {
    filePath,
    timestamp: Date.now(),
    retries: 0,
  });

  setTimeout(() => {
    if (syncQueue.has(filePath)) {
      processQueue();
    }
  }, DEBOUNCE_DELAY);
}
