import { describe, it, expect, beforeEach, vi } from "bun:test";

describe("queue", () => {
  beforeEach(() => {
    // no-op
  });

  it("addToQueue ignores non-json and enqueues json triggering process", async () => {
    const sync = await import(`../src/sync.ts?case=${Date.now()}-q1`);
    const spy = vi.spyOn(sync, "syncFile").mockResolvedValue(true);
    const q = await import(`../src/queue.ts?case=${Date.now()}-q1`);

    q.addToQueue("a.txt"); // ignored
    q.addToQueue("a.json");

    // Wait a bit longer than default debounce (500ms)
    await new Promise((r) => setTimeout(r, 600));

    expect(spy).toHaveBeenCalledWith("a.json");
  });

  it("processQueue schedules retry when syncFile fails", async () => {
    const sync = await import(`../src/sync.ts?case=${Date.now()}-q2`);
    const spy = vi.spyOn(sync, "syncFile").mockResolvedValue(false);
    const q = await import(`../src/queue.ts?case=${Date.now()}-q2`);

    q.addToQueue("b.json");
    await new Promise((r) => setTimeout(r, 600));

    // After first failure, an exponential backoff timer should schedule another attempt.
    // Give sufficient time (debounce + backoff) default backoff base 1000ms
    await new Promise((r) => setTimeout(r, 1100));

    expect(spy.mock.calls.filter(c => c[0] === "b.json").length).toBeGreaterThanOrEqual(2);
  });
});
