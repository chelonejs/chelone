import { describe, expect, it, vi } from "vitest";
import { createDataProviderLog } from "./data-provider-log";

/** A clock and timer that tick by hand, so a test pins exact values. */
function manualTime() {
  let perf = 0;
  let wall = Date.parse("2026-01-02T03:04:05.000Z");
  return {
    now: () => perf,
    clock: () => new Date(wall),
    advance(ms: number) {
      perf += ms;
      wall += ms;
    },
  };
}

describe("createDataProviderLog", () => {
  it("logs a resolved call with its method, resource, params, result and duration", async () => {
    const time = manualTime();
    const log = createDataProviderLog({ now: time.now, clock: time.clock });
    const params = { id: 7 };
    const result = { data: { id: 7, title: "Hello" } };
    const provider = {
      getOne: async (_resource: string, _params: { id: number }) => {
        time.advance(25);
        return result;
      },
    };

    const returned = await log.wrap(provider).getOne("posts", params);

    expect(returned).toBe(result);
    expect(log.store.getSnapshot().entries).toEqual([
      {
        id: 1,
        method: "getOne",
        resource: "posts",
        params,
        status: "ok",
        durationMs: 25,
        at: "2026-01-02T03:04:05.000Z",
        result,
      },
    ]);
  });

  it("logs a rejected call and rethrows the same error object", async () => {
    const log = createDataProviderLog();
    const failure = new Error("boom");
    const provider = {
      getOne: async (_resource: string, _params: object): Promise<never> => {
        throw failure;
      },
    };

    await expect(log.wrap(provider).getOne("posts", {})).rejects.toBe(failure);

    const [entry] = log.store.getSnapshot().entries;
    expect(entry).toMatchObject({
      status: "error",
      error: "boom",
      method: "getOne",
    });
    expect(entry).not.toHaveProperty("result");
  });

  it("logs a non-Error rejection with String()", async () => {
    const log = createDataProviderLog();
    const provider = {
      getList: (_resource: string, _params: object): Promise<never> =>
        Promise.reject("plain text"),
    };

    await expect(log.wrap(provider).getList("posts", {})).rejects.toBe(
      "plain text",
    );

    expect(log.store.getSnapshot().entries[0]).toMatchObject({
      status: "error",
      error: "plain text",
    });
  });

  it("wraps a custom method and passes every argument with this set to the provider", async () => {
    const log = createDataProviderLog();
    const seen: { self: object; args: (string | number | object)[] }[] = [];
    const provider = {
      async publish(resource: string, params: object, extra: number) {
        seen.push({ self: this, args: [resource, params, extra] });
        return "published";
      },
    };
    const params = { id: 1 };

    const wrapped = log.wrap(provider);
    const returned = await wrapped.publish("posts", params, 42);

    expect(returned).toBe("published");
    expect(seen).toHaveLength(1);
    expect(seen[0]?.self).toBe(provider);
    expect(seen[0]?.args).toEqual(["posts", params, 42]);
    expect(log.store.getSnapshot().entries[0]).toMatchObject({
      method: "publish",
      resource: "posts",
      params,
      result: "published",
    });
  });

  it("reads the resource as an empty string when the first argument is not a string", async () => {
    const log = createDataProviderLog();
    const provider = { ping: async (_value: number) => "pong" };

    await log.wrap(provider).ping(3);

    expect(log.store.getSnapshot().entries[0]).toMatchObject({
      method: "ping",
      resource: "",
    });
  });

  it("turns a synchronous throw into a rejection that is logged", async () => {
    const log = createDataProviderLog();
    const failure = new Error("sync boom");
    const provider = {
      getOne(_resource: string, _params: object): Promise<never> {
        throw failure;
      },
    };

    const call = log.wrap(provider).getOne("posts", {});

    expect(call).toBeInstanceOf(Promise);
    await expect(call).rejects.toBe(failure);
    expect(log.store.getSnapshot().entries[0]).toMatchObject({
      status: "error",
      error: "sync boom",
    });
  });

  it("returns a promise for a method that answers synchronously", async () => {
    const log = createDataProviderLog();
    const provider = { count: (_resource: string) => 3 };

    const call = log.wrap(provider).count("posts");

    expect(call).toBeInstanceOf(Promise);
    await expect(call).resolves.toBe(3);
    expect(log.store.getSnapshot().entries[0]).toMatchObject({
      status: "ok",
      result: 3,
    });
  });

  it("copies non-function properties and leaves the original provider unchanged", () => {
    const log = createDataProviderLog();
    const getOne = async (_resource: string, _params: object) => "one";
    const settings = { url: "https://example.test" };
    const provider = { getOne, settings, name: "demo" };

    const wrapped = log.wrap(provider);

    expect(wrapped).not.toBe(provider);
    expect(wrapped.name).toBe("demo");
    expect(wrapped.settings).toBe(settings);
    expect(wrapped.getOne).not.toBe(getOne);
    expect(provider.getOne).toBe(getOne);
    expect(Object.keys(provider)).toEqual(["getOne", "settings", "name"]);
  });

  it("keeps only the newest maxEntries entries, in the order they settle", async () => {
    const log = createDataProviderLog({ maxEntries: 2 });
    const releases: (() => void)[] = [];
    const provider = {
      getOne: (_resource: string, _params: object) =>
        new Promise<string>((resolve) => {
          releases.push(() => resolve("done"));
        }),
    };
    const wrapped = log.wrap(provider);

    const first = wrapped.getOne("a", {});
    const second = wrapped.getOne("b", {});
    const third = wrapped.getOne("c", {});
    releases[2]?.();
    releases[0]?.();
    releases[1]?.();
    await Promise.all([first, second, third]);

    // ids follow the order calls started; the store follows the order they settled.
    expect(log.store.getSnapshot().entries.map((e) => e.id)).toEqual([1, 2]);
    expect(log.store.getSnapshot().entries.map((e) => e.resource)).toEqual([
      "a",
      "b",
    ]);
  });

  it("reads a maxEntries below 1 as 1", async () => {
    const log = createDataProviderLog({ maxEntries: 0 });
    const wrapped = log.wrap({ ping: async (_resource: string) => "pong" });

    await wrapped.ping("a");
    await wrapped.ping("b");

    expect(log.store.getSnapshot().entries.map((e) => e.resource)).toEqual([
      "b",
    ]);
  });

  it("keeps 50 entries by default", async () => {
    const log = createDataProviderLog();
    const wrapped = log.wrap({ ping: async (_resource: string) => "pong" });

    for (let i = 0; i < 55; i++) await wrapped.ping("a");

    const ids = log.store.getSnapshot().entries.map((e) => e.id);
    expect(ids).toHaveLength(50);
    expect(ids[0]).toBe(6);
    expect(ids.at(-1)).toBe(55);
  });

  it("clear empties the log and ids keep counting", async () => {
    const log = createDataProviderLog();
    const wrapped = log.wrap({ ping: async (_resource: string) => "pong" });
    const listener = vi.fn();
    await wrapped.ping("a");
    await wrapped.ping("b");
    log.store.subscribe(listener);

    log.clear();

    expect(log.store.getSnapshot().entries).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);

    await wrapped.ping("c");
    expect(log.store.getSnapshot().entries.map((e) => e.id)).toEqual([3]);
  });

  it("starts ids at 1 and notifies subscribers once per settled call", async () => {
    const log = createDataProviderLog();
    const wrapped = log.wrap({ ping: async (_resource: string) => "pong" });
    const listener = vi.fn();
    log.store.subscribe(listener);

    const pending = wrapped.ping("a");
    expect(listener).not.toHaveBeenCalled();
    await pending;

    expect(listener).toHaveBeenCalledTimes(1);
    expect(log.store.getSnapshot().entries[0]?.id).toBe(1);
  });

  it("keeps an error message with markup as given", async () => {
    const log = createDataProviderLog();
    const markup = "<img src=x onerror=alert(1)>";
    const provider = {
      getOne: async (_resource: string, _params: object): Promise<never> => {
        throw new Error(markup);
      },
    };

    await expect(log.wrap(provider).getOne("posts", {})).rejects.toThrow(
      markup,
    );

    expect(log.store.getSnapshot().entries[0]?.error).toBe(markup);
  });
});
