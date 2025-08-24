import { homedir, platform } from "os";
import { join } from "path";

// Helpers to read env with fallback
function envStr(name: string, fallback?: string): string | undefined {
  const v = Bun.env[name];
  return v !== undefined && v !== "" ? v : fallback;
}

function envNum(name: string, fallback: number): number {
  const v = Bun.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Cross-platform default base path for OrcaSlicer if not provided via env
function defaultOrcaBasePath(): string {
  const plt = platform();
  if (plt === "win32") {
    return join(homedir(), "AppData", "Roaming", "OrcaSlicer", "user", "default");
  }
  if (plt === "darwin") {
    return join(homedir(), "Library", "Application Support", "OrcaSlicer", "user", "default");
  }
  // linux and others: follow XDG-ish convention
  return join(homedir(), ".config", "OrcaSlicer", "user", "default");
}

// Watch folders (comma-separated in env). Default: filament,machine,process
const foldersCsv = envStr("ORCA_WATCH_FOLDERS", "filament,machine,process")!;
export const foldersToWatch = foldersCsv.split(",").map((s) => s.trim()).filter(Boolean);

// Base path to OrcaSlicer profile directory; can be overridden by ORCA_BASE_PATH
export const pathBase = envStr("ORCA_BASE_PATH", defaultOrcaBasePath())!;

// Queue and retry tunables (env-overridable)
export const DEBOUNCE_DELAY = envNum("ORCA_DEBOUNCE_DELAY", 500); // ms
export const MAX_RETRIES = envNum("ORCA_MAX_RETRIES", 3);
export const RETRY_DELAY = envNum("ORCA_RETRY_DELAY", 1000); // ms

// S3/MinIO config via env (kept here so all variables are centralized)
export const S3_ACCESS_KEY = envStr("S3_ACCESS_KEY", Bun.env.MINIO_ACCESS_KEY);
export const S3_SECRET_KEY = envStr("S3_SECRET_KEY", Bun.env.MINIO_SECRET_KEY);
export const S3_BUCKET = envStr("S3_BUCKET", Bun.env.MINIO_BUCKET_NAME);
export const S3_REGION = envStr("S3_REGION", "eu-west-hetzner");
export const S3_ENDPOINT = envStr("S3_ENDPOINT", "minio.hagenfaber.eu");
