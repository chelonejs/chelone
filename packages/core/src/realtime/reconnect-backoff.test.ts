import { describe, expect, it } from "vitest";
import { reconnectDelay, resolveReconnectConfig } from "./reconnect-backoff";

describe("resolveReconnectConfig", () => {
  it("fills shadmin's defaults and keeps what is given", () => {
    expect(resolveReconnectConfig()).toEqual({
      enabled: true,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      maxAttempts: Number.POSITIVE_INFINITY,
      jitter: 0.3,
    });
    expect(
      resolveReconnectConfig({ enabled: false, maxDelayMs: 5000, jitter: 0 }),
    ).toEqual({
      enabled: false,
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      maxAttempts: Number.POSITIVE_INFINITY,
      jitter: 0,
    });
  });
});

describe("reconnectDelay", () => {
  const noJitter = resolveReconnectConfig({
    initialDelayMs: 100,
    maxDelayMs: 1000,
    jitter: 0,
  });

  it("doubles from initialDelayMs and stops at maxDelayMs", () => {
    const delays = [0, 1, 2, 3, 4, 10].map((attempt) =>
      reconnectDelay(attempt, noJitter),
    );

    expect(delays).toEqual([100, 200, 400, 800, 1000, 1000]);
  });

  it("jitter moves the delay by at most its share and never below zero", () => {
    const config = resolveReconnectConfig({
      initialDelayMs: 100,
      maxDelayMs: 1000,
      jitter: 0.5,
    });

    expect(reconnectDelay(0, config, () => 0)).toBe(50);
    expect(reconnectDelay(0, config, () => 0.5)).toBe(100);
    expect(reconnectDelay(0, config, () => 1)).toBe(150);

    const wild = resolveReconnectConfig({ initialDelayMs: 100, jitter: 5 });
    expect(reconnectDelay(0, wild, () => 0)).toBe(0);
  });
});
