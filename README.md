# OrcaSync

To install dependencies:

```bash
bun install
```

Configuration (env):
- Copy .env.example to .env and adjust values as needed.
- Bun automatically loads .env into Bun.env when running via bun.

Environment variables (add these to your .env):

```env
ORCA_WATCH_FOLDERS=filament,machine,process # comma-separated folders inside ORCA_BASE_PATH
ORCA_BASE_PATH=                             # override OrcaSlicer profile base path; default is OS-specific
ORCA_DEBOUNCE_DELAY=500                    # debounce delay in ms
ORCA_MAX_RETRIES=3                         # max retry attempts
ORCA_RETRY_DELAY=1000                      # base delay in ms for exponential backoff
S3_ACCESS_KEY=                             # access key (or use MINIO_ACCESS_KEY)
S3_SECRET_KEY=                             # secret key (or use MINIO_SECRET_KEY)
S3_BUCKET=                                 # bucket name (or use MINIO_BUCKET_NAME)
S3_REGION=eu-west-hetzner                  # region
S3_ENDPOINT=minio.hagenfaber.eu            # endpoint
MINIO_ACCESS_KEY=                          # optional legacy fallback
MINIO_SECRET_KEY=                          # optional legacy fallback
MINIO_BUCKET_NAME=                         # optional legacy fallback
```

To run (development):

```bash
bun run --watch index.ts
```

Entry point:
- index.ts only imports and starts the app (startup command).
- Main application logic lives in src/app.ts and exports start().

This project was created using `bun init` in bun v1.2.19. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
