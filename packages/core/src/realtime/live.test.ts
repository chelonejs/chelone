import { QueryClient } from "@tanstack/query-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listKey, lockKey, locksKey, oneKey } from "../data/keys";
import type { DataProvider } from "../data/types";
import { startUndoableMutation } from "../data/undoable";
import {
  subscribeLiveLock,
  subscribeLiveLocks,
  subscribeLiveRecord,
  subscribeLiveRecords,
  subscribeLiveResource,
} from "./live";
import { memoryTransport } from "./memory-transport";
import { realtimeDataProvider } from "./realtime-data-provider";

const setup = () => {
  const transport = memoryTransport();
  const dataProvider = realtimeDataProvider({} as DataProvider, transport);
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const seed = () => {
    queryClient.setQueryData(listKey("posts"), { data: [] });
    queryClient.setQueryData(oneKey("posts", { id: 1 }), { id: 1 });
    queryClient.setQueryData(oneKey("posts", { id: 2 }), { id: 2 });
    queryClient.setQueryData(oneKey("comments", { id: 1 }), { id: 1 });
    queryClient.setQueryData(lockKey("posts", { id: 1 }), null);
    queryClient.setQueryData(locksKey("posts"), []);
  };
  seed();
  const stale = (key: readonly unknown[]) =>
    queryClient.getQueryState(key)?.isInvalidated ?? false;
  const emit = (topic: string) =>
    dataProvider.publish(topic, { type: "updated", payload: {} });
  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  return {
    ctx: { dataProvider, queryClient },
    transport,
    invalidate,
    stale,
    emit,
    flush,
  };
};

const openUndoable = (queryClient: QueryClient) =>
  startUndoableMutation({
    queryClient,
    queryKeys: [["posts"]],
    applyOptimistic: () => {},
    commit: async () => {},
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("subscribeLiveResource", () => {
  it("invalidates the resource's queries on an event", async () => {
    const { ctx, emit, flush, stale } = setup();
    subscribeLiveResource(ctx, "posts");

    await emit("resource/posts");
    await flush();

    expect(stale(listKey("posts"))).toBe(true);
    expect(stale(oneKey("posts", { id: 1 }))).toBe(true);
  });

  it("leaves other resources and lock queries alone", async () => {
    const { ctx, emit, flush, stale } = setup();
    subscribeLiveResource(ctx, "posts");

    await emit("resource/posts");
    await emit("resource/comments");
    await flush();

    expect(stale(oneKey("comments", { id: 1 }))).toBe(false);
    expect(stale(lockKey("posts", { id: 1 }))).toBe(false);
    expect(stale(locksKey("posts"))).toBe(false);
  });

  it("invalidates on reconnect", async () => {
    const { ctx, transport, flush, stale } = setup();
    subscribeLiveResource(ctx, "posts");

    transport.simulateReconnect();
    await flush();

    expect(stale(listKey("posts"))).toBe(true);
  });

  it("events in the same tick invalidate once", async () => {
    const { ctx, emit, flush, invalidate } = setup();
    subscribeLiveResource(ctx, "posts");

    await Promise.all([emit("resource/posts"), emit("resource/posts")]);
    await flush();

    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("paused events are held and resume invalidates once", async () => {
    const { ctx, emit, flush, invalidate, stale } = setup();
    let paused = true;
    const live = subscribeLiveResource(ctx, "posts", { paused: () => paused });

    await emit("resource/posts");
    await emit("resource/posts");
    await flush();
    expect(invalidate).not.toHaveBeenCalled();
    expect(stale(listKey("posts"))).toBe(false);

    paused = false;
    live.resume();
    await flush();

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(stale(listKey("posts"))).toBe(true);
  });

  it("resume does nothing when no event was missed", async () => {
    const { ctx, flush, invalidate } = setup();
    const live = subscribeLiveResource(ctx, "posts", { paused: () => false });

    live.resume();
    await flush();

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("holds events while an undoable mutation is pending and replays them once it commits", async () => {
    const { ctx, emit, flush, invalidate } = setup();
    subscribeLiveResource(ctx, "posts");
    const handle = openUndoable(ctx.queryClient);

    await emit("resource/posts");
    await emit("resource/posts");
    await flush();
    expect(invalidate).not.toHaveBeenCalled();

    await handle.commit();
    await flush();
    expect(invalidate).toHaveBeenCalledTimes(1);

    await emit("resource/posts");
    await flush();
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it("keeps holding while the committed server call is in flight", async () => {
    const { ctx, emit, flush, invalidate } = setup();
    subscribeLiveResource(ctx, "posts");
    let finish: () => void = () => {};
    const handle = startUndoableMutation({
      queryClient: ctx.queryClient,
      queryKeys: [["posts"]],
      applyOptimistic: () => {},
      commit: () => new Promise<void>((resolve) => (finish = resolve)),
    });

    const committed = handle.commit();
    await emit("resource/posts");
    await flush();
    expect(invalidate).not.toHaveBeenCalled();

    finish();
    await committed;
    await flush();
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("replays held events when the undoable mutation is undone", async () => {
    const { ctx, emit, flush, invalidate } = setup();
    subscribeLiveResource(ctx, "posts");
    const handle = openUndoable(ctx.queryClient);

    await emit("resource/posts");
    handle.undo();
    await flush();

    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("waits for every pending undoable mutation before replaying", async () => {
    const { ctx, emit, flush, invalidate } = setup();
    subscribeLiveResource(ctx, "posts");
    const first = openUndoable(ctx.queryClient);
    const second = openUndoable(ctx.queryClient);

    await emit("resource/posts");
    first.undo();
    await flush();
    expect(invalidate).not.toHaveBeenCalled();

    second.undo();
    await flush();
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("stop discards events held for a pending undoable mutation", async () => {
    const { ctx, emit, flush, invalidate } = setup();
    const live = subscribeLiveResource(ctx, "posts");
    const handle = openUndoable(ctx.queryClient);

    await emit("resource/posts");
    live.stop();
    handle.undo();
    await flush();

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("resume keeps a missed event when an undoable mutation is pending", async () => {
    const { ctx, emit, flush, invalidate } = setup();
    let paused = true;
    const live = subscribeLiveResource(ctx, "posts", { paused: () => paused });

    await emit("resource/posts");
    const handle = openUndoable(ctx.queryClient);
    paused = false;
    live.resume();
    await flush();
    expect(invalidate).not.toHaveBeenCalled();

    handle.undo();
    await flush();
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("stop removes the topic and reconnect listeners", async () => {
    const { ctx, transport, emit, flush, invalidate } = setup();
    const subscribe = vi.spyOn(ctx.dataProvider, "subscribe");
    const live = subscribeLiveResource(ctx, "posts");
    expect(subscribe).toHaveBeenCalledTimes(1);

    live.stop();
    await emit("resource/posts");
    transport.simulateReconnect();
    await flush();

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("throws a clear error on a plain data provider", () => {
    const ctx = {
      dataProvider: {} as DataProvider,
      queryClient: new QueryClient(),
    };

    expect(() => subscribeLiveResource(ctx, "posts")).toThrow(
      /subscribeLiveResource: dataProvider does not implement subscribe\(\)/,
    );
  });
});

describe("subscribeLiveRecord", () => {
  it("reacts to its own record topic only", async () => {
    const { ctx, transport, emit, flush, stale } = setup();
    subscribeLiveRecord(ctx, "posts", 1);

    await emit("resource/posts/2");
    await emit("resource/posts");
    await flush();
    expect(stale(oneKey("posts", { id: 1 }))).toBe(false);

    await emit("resource/posts/1");
    await flush();
    expect(stale(oneKey("posts", { id: 1 }))).toBe(true);
    expect(stale(lockKey("posts", { id: 1 }))).toBe(false);

    ctx.queryClient.setQueryData(listKey("posts"), { data: [] });
    transport.simulateReconnect();
    await flush();
    expect(stale(listKey("posts"))).toBe(true);
  });
});

describe("subscribeLiveRecords", () => {
  it("watches every id and stop releases them all", async () => {
    const { ctx, emit, flush, invalidate } = setup();
    const live = subscribeLiveRecords(ctx, "posts", [1, 2]);

    await emit("resource/posts/1");
    await flush();
    await emit("resource/posts/2");
    await flush();
    expect(invalidate).toHaveBeenCalledTimes(2);

    live.stop();
    await emit("resource/posts/1");
    await emit("resource/posts/2");
    await flush();
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it("an empty id list subscribes to nothing", async () => {
    const { ctx, emit, flush, invalidate } = setup();
    const subscribe = vi.spyOn(ctx.dataProvider, "subscribe");
    const live = subscribeLiveRecords(ctx, "posts", []);

    await emit("resource/posts");
    await flush();

    expect(subscribe).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(() => live.stop()).not.toThrow();
  });

  it("an empty id list ignores reconnects", async () => {
    const { ctx, transport, flush, invalidate } = setup();
    subscribeLiveRecords(ctx, "posts", []);

    transport.simulateReconnect();
    await flush();

    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe("subscribeLiveLock", () => {
  it("invalidates only that lock's query", async () => {
    const { ctx, emit, flush, stale } = setup();
    subscribeLiveLock(ctx, "posts", 1);

    await emit("lock/posts/1");
    await flush();

    expect(stale(lockKey("posts", { id: 1 }))).toBe(true);
    expect(stale(locksKey("posts"))).toBe(false);
    expect(stale(oneKey("posts", { id: 1 }))).toBe(false);
    expect(stale(listKey("posts"))).toBe(false);
  });

  it("invalidates its lock query on reconnect", async () => {
    const { ctx, transport, flush, stale } = setup();
    subscribeLiveLock(ctx, "posts", 1);

    transport.simulateReconnect();
    await flush();

    expect(stale(lockKey("posts", { id: 1 }))).toBe(true);
    expect(stale(locksKey("posts"))).toBe(false);
    expect(stale(listKey("posts"))).toBe(false);
  });
});

describe("subscribeLiveLocks", () => {
  it("invalidates only the locks query", async () => {
    const { ctx, emit, flush, stale } = setup();
    subscribeLiveLocks(ctx, "posts");

    await emit("lock/posts");
    await flush();

    expect(stale(locksKey("posts"))).toBe(true);
    expect(stale(lockKey("posts", { id: 1 }))).toBe(false);
    expect(stale(oneKey("posts", { id: 1 }))).toBe(false);
  });

  it("invalidates the locks query on reconnect", async () => {
    const { ctx, transport, flush, stale } = setup();
    subscribeLiveLocks(ctx, "posts");

    transport.simulateReconnect();
    await flush();

    expect(stale(locksKey("posts"))).toBe(true);
    expect(stale(lockKey("posts", { id: 1 }))).toBe(false);
    expect(stale(listKey("posts"))).toBe(false);
  });
});
