import { describe, it, expect } from "bun:test";
import { isJsonFile, getFileHash } from "../src/utils.ts";
import { tmpdir } from "os";
import { join } from "path";

describe("utils.isJsonFile", () => {
  it("returns true for .json (case-insensitive)", () => {
    expect(isJsonFile("a.json")).toBe(true);
    expect(isJsonFile("A.JSON")).toBe(true);
  });
  it("returns false for non-json", () => {
    expect(isJsonFile("a.txt")).toBe(false);
    expect(isJsonFile("/path/file.yaml")).toBe(false);
    expect(isJsonFile("noext")).toBe(false);
  });
});

describe("utils.getFileHash", () => {
  it("computes sha256 for file content", async () => {
    const dir = tmpdir();
    const fp = join(dir, `hash-test-${Date.now()}-${Math.random()}.txt`);
    const content = "hello world\n";
    await Bun.write(fp, content);
    const hash = await getFileHash(fp);
    expect(hash).toHaveLength(64);
    const again = await getFileHash(fp);
    expect(again).toBe(hash);
  });

  it("returns empty string on error (missing file)", async () => {
    const hash = await getFileHash("Z:/definitely/does/not/exist.json");
    expect(hash).toBe("");
  });
});
