import { describe, it, expect, vi, beforeEach } from "bun:test";

// We'll mock fs.watch to capture the callback

describe("watcher.createWatcher", () => {
  beforeEach(() => {
    // ensure base path is set to something predictable
    Bun.env.ORCA_BASE_PATH = "C:/tmp/orca-test";
  });

  it("calls addToQueue for JSON files only", async () => {
    // Mock addToQueue
    const queue = await import("../src/queue.ts");
    const addSpy = vi.spyOn(queue, "addToQueue").mockImplementation(() => {});

    const fsMod = await import("fs");
    const spyWatch = vi.spyOn(fsMod, "watch").mockImplementation(((path: string, cb: any) => {
      setTimeout(() => cb("change", "file.json"), 0);
      setTimeout(() => cb("change", "file.txt"), 0);
      return { close() {} } as any;
    }) as any);

    const { createWatcher } = await import("../src/watcher.ts");
    const w = createWatcher("filament");

    await new Promise((r) => setTimeout(r, 30));

    expect(addSpy).toHaveBeenCalledWith("filament/file.json");
    expect(addSpy.mock.calls.some((c) => c[0] === "filament/file.txt")).toBe(false);

    w.close();
    spyWatch.mockRestore();
  });
});
