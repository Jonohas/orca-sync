import { start } from "./src/app.ts";
import { logger } from "./src/logger.ts";

start().catch((err) => logger.error("Unhandled error in start", err));