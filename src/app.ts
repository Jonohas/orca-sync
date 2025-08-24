import { foldersToWatch } from "./config.ts";
import { initialSync } from "./sync.ts";
import { createWatcher } from "./watcher.ts";

export async function start() {
  await initialSync();

  const watchers = foldersToWatch.map(createWatcher);

  process.on("SIGINT", () => {
    console.log("Closing watchers...");
    for (const watcher of watchers) {
      watcher.close();
    }
    process.exit(0);
  });

  console.log(`Watching folders for JSON files: ${foldersToWatch.join(", ")}`);
}
