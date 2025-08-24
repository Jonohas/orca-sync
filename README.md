# OrcaSync

To install dependencies:

```bash
bun install
```

Configuration (env):
- Copy .env.example to .env and adjust values as needed.
- Bun automatically loads .env into Bun.env when running via bun.

Key variables:
- ORCA_WATCH_FOLDERS: comma-separated list of folders to watch inside ORCA_BASE_PATH (default: filament,machine,process)
- ORCA_BASE_PATH: base path to OrcaSlicer profile directory; if omitted, a cross-platform default is used:
  - Windows: %USERPROFILE%\AppData\Roaming\OrcaSlicer\user\default
  - macOS:   ~/Library/Application Support/OrcaSlicer/user/default
  - Linux:   ~/.config/OrcaSlicer/user/default
- ORCA_DEBOUNCE_DELAY, ORCA_MAX_RETRIES, ORCA_RETRY_DELAY: queue/backoff tuning
- S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_REGION, S3_ENDPOINT (MINIO_* fallbacks supported)

To run (development):

```bash
bun run --watch index.ts
```

Entry point:
- index.ts only imports and starts the app (startup command).
- Main application logic lives in src/app.ts and exports start().

This project was created using `bun init` in bun v1.2.19. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
