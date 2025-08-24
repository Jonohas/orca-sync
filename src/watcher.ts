import { watch } from "fs";
import { pathBase } from "./config.ts";
import { addToQueue } from "./queue.ts";
import { isJsonFile } from "./utils.ts";
import { join } from "path";

export const createWatcher = (folder: string) => {
  return watch(join(pathBase, folder), async (event, file) => {
    if (!file) return;

    const relativePath = `${folder}/${file}`;

    if (!isJsonFile(file)) {
      return;
    }

    console.log(`JSON file ${event}: ${relativePath}`);
    addToQueue(relativePath);
  });
};
