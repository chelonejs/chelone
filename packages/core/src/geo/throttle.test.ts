import { describe, expect, it } from "vitest";
import { createThrottle } from "./throttle";

/** A manual clock: `sleep` advances time instead of waiting. */
function clock() {
  let time = 1_000;
  const slept: number[] = [];
  return {
    slept,
    now: () => time,
    sleep: async (ms: number) => {
      slept.push(ms);
      time += ms;
    },
  };
}

describe("createThrottle", () => {
  it("lets the first call through without sleeping", async () => {
    const c = clock();
    const throttle = createThrottle({ minIntervalMs: 1000, ...c });
    await throttle.wait();
    expect(c.slept).toEqual([]);
  });

  it("spaces two simultaneous calls by the minimum interval", async () => {
    const c = clock();
    const throttle = createThrottle({ minIntervalMs: 1000, ...c });
    const stamps: number[] = [];
    await Promise.all(
      [0, 1, 2].map(async () => {
        await throttle.wait();
        stamps.push(c.now());
      }),
    );
    expect((stamps[1] ?? 0) - (stamps[0] ?? 0)).toBeGreaterThanOrEqual(1000);
    expect((stamps[2] ?? 0) - (stamps[1] ?? 0)).toBeGreaterThanOrEqual(1000);
  });

  it("an aborted signal rejects while waiting", async () => {
    const controller = new AbortController();
    const throttle = createThrottle({
      minIntervalMs: 1000,
      now: () => 0,
      sleep: (_ms, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () =>
            reject(signal.reason ?? new DOMException("Aborted", "AbortError")),
          );
        }),
    });
    await throttle.wait();
    const waiting = throttle.wait(controller.signal);
    controller.abort();
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects at once for an already aborted signal", async () => {
    const c = clock();
    const throttle = createThrottle({ minIntervalMs: 1000, ...c });
    await expect(throttle.wait(AbortSignal.abort())).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("an aborted waiter frees its slot for the next caller", async () => {
    const c = clock();
    const throttle = createThrottle({ minIntervalMs: 1000, ...c });
    await throttle.wait();
    await expect(throttle.wait(AbortSignal.abort())).rejects.toMatchObject({
      name: "AbortError",
    });
    await throttle.wait();
    expect(c.slept).toEqual([1000]);
  });
});
