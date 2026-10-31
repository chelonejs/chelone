import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApplicationUpdateStore } from "./application-update-store";

const HOUR = 3_600_000;

/** Queue of response bodies, one consumed per fetch; the last repeats. */
function stubFetch(...bodies: string[]) {
  let call = 0;
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
    const body = bodies[Math.min(call++, bodies.length - 1)] ?? "";
    return new Response(body);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("createApplicationUpdateStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("location", { origin: "https://app.test" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not fetch before the first subscriber", async () => {
    const fetchMock = stubFetch("v1");
    createApplicationUpdateStore();
    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("checks straight away on subscribe, then once per interval", async () => {
    const fetchMock = stubFetch("v1");
    const store = createApplicationUpdateStore();
    store.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://app.test/index.html");

    await vi.advanceTimersByTimeAsync(HOUR);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never fetches while disabled", async () => {
    const fetchMock = stubFetch("v1");
    const store = createApplicationUpdateStore({ disabled: true });
    store.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never fetches when there is neither a url nor a location", async () => {
    vi.stubGlobal("location", undefined);
    const fetchMock = stubFetch("v1");
    const store = createApplicationUpdateStore();
    store.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the first response as the baseline", async () => {
    stubFetch("v1", "v1");
    const store = createApplicationUpdateStore({ interval: 1000 });
    store.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.getSnapshot()).toEqual({ hasNewVersion: false });
  });

  it("sets hasNewVersion when the body changes", async () => {
    stubFetch("v1", "v2");
    const store = createApplicationUpdateStore({ interval: 1000 });
    const callback = vi.fn();
    store.subscribe(callback);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getSnapshot()).toEqual({ hasNewVersion: false });

    await vi.advanceTimersByTimeAsync(1000);
    expect(store.getSnapshot()).toEqual({ hasNewVersion: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("ignores a thrown fetch and a non-ok response", async () => {
    const fetchMock = vi
      .fn<(url: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(new Response("v1"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response("v2", { status: 500 }))
      .mockResolvedValue(new Response("v1"));
    vi.stubGlobal("fetch", fetchMock);
    const store = createApplicationUpdateStore({ interval: 1000 });
    store.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(3000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(store.getSnapshot()).toEqual({ hasNewVersion: false });
  });

  it("ignores a fetchOptions function that throws", async () => {
    const fetchMock = stubFetch("v1");
    const store = createApplicationUpdateStore({
      interval: 1000,
      fetchOptions: () => {
        throw new Error("token not ready");
      },
    });
    store.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toEqual({ hasNewVersion: false });
  });

  it("sends cache no-store over a caller cache option", async () => {
    const fetchMock = stubFetch("v1");
    const store = createApplicationUpdateStore({
      fetchOptions: { cache: "force-cache", credentials: "include" },
    });
    store.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      cache: "no-store",
      credentials: "include",
    });
  });

  it("reads a fetchOptions function at each check", async () => {
    const fetchMock = stubFetch("v1");
    let token = "a";
    const store = createApplicationUpdateStore({
      interval: 1000,
      fetchOptions: () => ({ headers: { authorization: token } }),
    });
    store.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(0);
    token = "b";
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock.mock.calls.map(([, init]) => init?.headers)).toEqual([
      { authorization: "a" },
      { authorization: "b" },
    ]);
  });

  it("calls onNewVersionAvailable once and stops polling", async () => {
    const fetchMock = stubFetch("v1", "v2", "v3");
    const onNewVersionAvailable = vi.fn();
    const store = createApplicationUpdateStore({
      interval: 1000,
      onNewVersionAvailable,
    });
    store.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onNewVersionAvailable).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({ hasNewVersion: true });
  });

  it("stops its timer on unsubscribe and keeps its baseline on resubscribe", async () => {
    const fetchMock = stubFetch("v1", "v1", "v2");
    const store = createApplicationUpdateStore({ interval: 1000 });
    const unsubscribe = store.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(0);
    unsubscribe();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Re-attach checks again straight away against the first baseline.
    store.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toEqual({ hasNewVersion: false });
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.getSnapshot()).toEqual({ hasNewVersion: true });
  });

  it("drops a check still in flight when the last subscriber leaves", async () => {
    let release: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            release = resolve;
          }),
      ),
    );
    const store = createApplicationUpdateStore();
    const unsubscribe = store.subscribe(() => {});
    unsubscribe();
    release(new Response("v1"));
    await vi.advanceTimersByTimeAsync(0);

    // The dropped response set no baseline, so the next check starts fresh.
    vi.stubGlobal("fetch", stubFetch("v2", "v3"));
    store.subscribe(() => {});
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getSnapshot()).toEqual({ hasNewVersion: false });
  });
});
