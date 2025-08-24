import { describe, it, expect, vi, beforeEach } from "bun:test";

// We'll mock fs.watch to capture the callback

describe("watcher.createWatcher", () => {
  beforeEach(() => {
    // ensure base path is set to something predictable
    Bun.env.ORCA_BASE_PATH = "C:/tmp/orca-test";
    vi.clearAllMocks();
  });

  it("calls addToQueue for JSON files only", async () => {
    const watcher = await import("../src/watcher.ts");
    const addMock = vi.fn();
    (watcher as any).__setAddToQueueForTest(addMock);

    (watcher as any).__handleEventForTest("filament", "change", "file.json");
    (watcher as any).__handleEventForTest("filament", "change", "file.txt");

    expect(addMock).toHaveBeenCalledWith("filament/file.json");
    expect(addMock.mock.calls.some((c: any[]) => c[0] === "filament/file.txt")).toBe(false);
  });
});
