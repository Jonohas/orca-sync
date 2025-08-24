import { describe, it, expect, beforeEach, vi } from "bun:test";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { mkdir } from "fs/promises";

function uniqueTempDir() {
  return join(tmpdir(), `orcasync-${Date.now()}-${Math.random()}`);
}

describe("sync.syncFile", () => {
  beforeEach(() => {
    // no-op, use actual config.pathBase
  });

  it("uploads when local exists and S3 missing", async () => {
    const { pathBase } = await import("../src/config.ts");
    const base = pathBase;
    await mkdir(join(base, "filament"), { recursive: true });
    const rel = "filament/test.json";
    await Bun.write(join(base, rel), "{\n  \"a\": 1\n}\n");

    const syncMod = await import(`../src/sync.ts?case=${Date.now()}-u1`);
    const s3 = await import("../src/s3.ts");

    let wroteKey: string | null = null;
    // @ts-ignore
    s3.s3Client.file = (key: string) => ({
      async exists() { return false; },
      async stat() { throw new Error("nope"); },
      async write(file: any) { wroteKey = key; return; },
    } as any);

    const ok = await syncMod.syncFile(rel);
    expect(ok).toBe(true);
    expect(wroteKey).toBe(rel);
  });

  it("updates when both exist and hashes differ", async () => {
    const { pathBase } = await import("../src/config.ts");
    const base = pathBase;
    await mkdir(join(base, "filament"), { recursive: true });
    const rel = "filament/test.json";
    await Bun.write(join(base, rel), "{\n  \"a\": 2\n}\n");

    const syncMod = await import(`../src/sync.ts?case=${Date.now()}-u2`);
    const s3 = await import("../src/s3.ts");

    let wrote = 0;
    // Pretend S3 has different hash and older time
    // @ts-ignore
    s3.s3Client.file = (key: string) => ({
      async exists() { return true; },
      async stat() { return { etag: '"deadbeef"', size: 10, lastModified: new Date(0) } as any; },
      async write(file: any) { wrote++; return; },
    } as any);

    const ok = await syncMod.syncFile(rel);
    expect(ok).toBe(true);
    expect(wrote).toBe(1);
  });

  it("deletes when S3 exists and local missing", async () => {
    const { pathBase } = await import("../src/config.ts");
    const base = pathBase;
    await mkdir(join(base, "filament"), { recursive: true });
    const rel = "filament/ghost.json";

    const syncMod = await import(`../src/sync.ts?case=${Date.now()}-u3`);
    const s3 = await import("../src/s3.ts");

    let deleted = 0;
    // @ts-ignore
    s3.s3Client.file = (key: string) => ({
      async exists() { return true; },
      async stat() { return { etag: '"hash"', size: 1, lastModified: new Date() } as any; },
      async delete() { deleted++; return; },
    } as any);

    const ok = await syncMod.syncFile(rel);
    expect(ok).toBe(true);
    expect(deleted).toBe(1);
  });

  it("skips non-JSON paths", async () => {
    const syncMod = await import(`../src/sync.ts?case=${Date.now()}-u4`);
    const ok = await syncMod.syncFile("filament/readme.txt");
    expect(ok).toBe(true);
  });
});
