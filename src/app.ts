import { foldersToWatch } from "./config.ts";
import { initialSync } from "./sync.ts";
import { createWatcher } from "./watcher.ts";
import { logger } from "./logger.ts";

export async function start() {
  await initialSync();

  const watchers = foldersToWatch.map(createWatcher);

  process.on("SIGINT", () => {
    logger.info("Closing watchers...");
    for (const watcher of watchers) {
      watcher.close();
    }
    process.exit(0);
  });

  logger.info(`Watching folders for JSON files: ${foldersToWatch.join(", ")}`);
}
