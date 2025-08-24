import { describe, it, expect, beforeEach, vi } from "bun:test";

describe("queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("addToQueue ignores non-json and enqueues json triggering process", async () => {
    const q = await import("../src/queue.ts");

    const syncMock = vi.fn().mockResolvedValue(true);
    (q as any).__setSyncFileForTest(syncMock);

    q.addToQueue("a.txt"); // ignored
    q.addToQueue("a.json");

    // Wait a bit longer than default debounce (500ms)
    await new Promise((r) => setTimeout(r, 600));

    expect(syncMock).toHaveBeenCalledWith("a.json");
  });

  it("processQueue schedules retry when syncFile fails", async () => {
    const q = await import("../src/queue.ts");

    const syncMock = vi.fn().mockResolvedValue(false);
    (q as any).__setSyncFileForTest(syncMock);

    q.addToQueue("b.json");
    await new Promise((r) => setTimeout(r, 600));

    // After first failure, an exponential backoff timer should schedule another attempt.
    // Give sufficient time (debounce + backoff). Note: implementation schedules processQueue after roughly 2x base backoff
    await new Promise((r) => setTimeout(r, 2100));

    const calls = syncMock.mock.calls.filter((c: any[]) => c[0] === "b.json").length;
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});
