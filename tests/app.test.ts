import { describe, it, expect, vi } from "bun:test";

describe("app.start", () => {
  it("runs initialSync and creates watchers", async () => {
    const sync = await import("../src/sync.ts");
    const watcher = await import("../src/watcher.ts");
    const config = await import("../src/config.ts");

    const initSpy = vi.spyOn(sync, "initialSync").mockResolvedValue();
    const createSpy = vi.spyOn(watcher, "createWatcher").mockImplementation(() => ({ close() {} } as any));

    const { start } = await import("../src/app.ts");
    await start();

    expect(initSpy).toHaveBeenCalled();
    // Creates one watcher per folder in config
    expect(createSpy.mock.calls.length).toBe(config.foldersToWatch.length);
  });
});
