import { describe, it, expect, beforeEach } from "bun:test";
import { tmpdir } from "os";
import { join } from "path";

// We'll import after setting up env/mocks as needed

describe("fileInfo", () => {
  it("getLocalFileInfo returns metadata and null for missing", async () => {
    const { getLocalFileInfo } = await import("../src/fileInfo.ts");
    const fp = join(tmpdir(), `fi-${Date.now()}-${Math.random()}.json`);
    await Bun.write(fp, "{\n  \"x\": 1\n}\n");
    const info = await getLocalFileInfo(fp);
    expect(info?.path).toBe(fp);
    expect(info?.size).toBeGreaterThan(0);
    expect(info?.hash?.length).toBe(64);

    const missing = await getLocalFileInfo(fp + ".missing");
    expect(missing).toBeNull();
  });

  it("getS3FileInfo uses s3Client mock", async () => {
    // Dynamically import module and monkey-patch s3Client
    const mod = await import("../src/fileInfo.ts");
    // @ts-ignore accessing unexported s3Client via separate module import
    const s3 = await import("../src/s3.ts");

    const fake = new Map<string, { etag: string; size: number; lastModified?: Date }>();
    fake.set("a/b.json", { etag: '"deadbeef"', size: 10, lastModified: new Date(1700000000000) });

    // Replace s3Client.file to return an object with exists/stat
    // @ts-ignore
    s3.s3Client.file = (key: string) => {
      return {
        async exists() {
          return fake.has(key);
        },
        async stat() {
          const e = fake.get(key)!;
          return { etag: e.etag, size: e.size, lastModified: e.lastModified } as any;
        },
      } as any;
    };

    const { getS3FileInfo } = mod;

    const info = await getS3FileInfo("a/b.json");
    expect(info).toEqual({
      path: "a/b.json",
      hash: "deadbeef",
      size: 10,
      modTime: 1700000000000,
    });

    const none = await getS3FileInfo("nope.json");
    expect(none).toBeNull();
  });
});
