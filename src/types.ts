export interface SyncEvent {
  filePath: string;
  timestamp: number;
  retries: number;
}

export interface FileInfo {
  path: string;
  modTime: number;
  hash: string;
  size: number;
}
