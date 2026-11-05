import { describe, expect, it, vi } from "vitest";
import { InertDataProvider } from "../__fixtures__/data-provider";
import { combineDataProviders } from "../data/combine-data-providers";
import type { DataProvider } from "../data/types";
import {
  assertRealtimeDataProvider,
  isRealtimeDataProvider,
  realtimeDataProvider,
} from "./realtime-data-provider";
import {
  type Lock,
  LockConflictError,
  type LockProvider,
  type RealtimeConnectionStatus,
  type RealtimeEvent,
  type RealtimeTransport,
} from "./types";

const verbs = [
  "getList",
  "getOne",
  "create",
  "update",
  "delete",
  "getMany",
  "getManyReference",
  "updateMany",
  "deleteMany",
] as const;

/**
 * Every verb is a spy that resolves a record whose `id` is the verb's name.
 * The spies are assigned, not `vi.spyOn`ed: a spy on an inherited method is a
 * non-enumerable own property, which a copy of the provider would drop.
 */
const baseProvider = () => {
  const provider = new InertDataProvider();
  provider.getList = vi.fn(async () => ({
    data: [{ id: "getList" }],
    total: 1,
  }));
  provider.getOne = vi.fn(async () => ({ data: { id: "getOne" } }));
  provider.create = vi.fn(async () => ({ data: { id: "create" } }));
  provider.update = vi.fn(async () => ({ data: { id: "update" } }));
  provider.delete = vi.fn(async () => ({ data: { id: "delete" } }));
  provider.getMany = vi.fn(async () => ({ data: [{ id: "getMany" }] }));
  provider.getManyReference = vi.fn(async () => ({
    data: [{ id: "getManyReference" }],
    total: 1,
  }));
  provider.updateMany = vi.fn(async () => ({ data: ["updateMany"] }));
  provider.deleteMany = vi.fn(async () => ({ data: ["deleteMany"] }));
  return provider;
};

const baseTransport = (): RealtimeTransport => ({
  subscribe: vi.fn(() => () => {}),
  publish: vi.fn(async () => {}),
});

const aLock: Lock = {
  resource: "posts",
  recordId: 1,
  identity: "ada",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const lockProvider = (): LockProvider => ({
  lock: vi.fn(async () => aLock),
  unlock: vi.fn(async () => aLock),
  getLock: vi.fn(async () => aLock),
  getLocks: vi.fn(async () => [aLock]),
});

describe("realtimeDataProvider", () => {
  it("delegates the nine verbs to the base provider", async () => {
    const base = baseProvider();
    const dp = realtimeDataProvider(base, baseTransport());

    await expect(dp.getList("posts", { filter: {} })).resolves.toEqual({
      data: [{ id: "getList" }],
      total: 1,
    });
    await dp.getOne("posts", { id: 1 });
    await dp.create("posts", { data: {} });
    await dp.update("posts", { id: 1, data: {} });
    await dp.delete("posts", { id: 1 });
    await dp.getMany("posts", { ids: [1] });
    await dp.getManyReference("posts", { target: "t", id: 1 });
    await dp.updateMany("posts", { ids: [1], data: {} });
    await dp.deleteMany("posts", { ids: [1] });

    for (const verb of verbs) {
      expect(base[verb]).toHaveBeenCalledTimes(1);
    }
    expect(base.getOne).toHaveBeenCalledWith("posts", { id: 1 });
  });

  it("keeps the verbs of a provider written as a class", async () => {
    class Api extends InertDataProvider {
      override async getList() {
        return { data: [{ id: "getList" }], total: 1 };
      }
      override async getOne() {
        return { data: { id: "getOne" } };
      }
    }
    const dp = realtimeDataProvider(new Api(), baseTransport());

    await expect(dp.getList("posts", { filter: {} })).resolves.toEqual({
      data: [{ id: "getList" }],
      total: 1,
    });
    await expect(dp.getOne("posts", { id: 1 })).resolves.toEqual({
      data: { id: "getOne" },
    });
  });

  it("keeps a custom method on the prototype of a class provider, bound to it", async () => {
    class Api extends InertDataProvider {
      readonly banned: string[] = [];
      async banUser(name: string) {
        this.banned.push(name);
        return this.banned.length;
      }
    }
    const hasBanUser = (
      provider: DataProvider,
    ): provider is DataProvider & Pick<Api, "banUser"> =>
      "banUser" in provider && typeof provider.banUser === "function";
    const api = new Api();
    const dp = realtimeDataProvider(api, baseTransport());

    if (!hasBanUser(dp)) throw new Error("banUser was not kept");
    await expect(dp.banUser("eve")).resolves.toBe(1);
    expect(api.banned).toEqual(["eve"]);
  });

  it("subscribe and publish go through the transport", async () => {
    const unsubscribe = vi.fn();
    const transport: RealtimeTransport = {
      subscribe: vi.fn(() => unsubscribe),
      publish: vi.fn(async () => {}),
    };
    const dp = realtimeDataProvider(baseProvider(), transport);
    const callback = vi.fn();
    const event: Omit<RealtimeEvent, "topic"> = {
      type: "created",
      payload: { ids: [1] },
    };

    expect(dp.subscribe("resource/posts", callback)).toBe(unsubscribe);
    await dp.publish("resource/posts", event);

    expect(transport.subscribe).toHaveBeenCalledWith(
      "resource/posts",
      callback,
    );
    expect(transport.publish).toHaveBeenCalledWith("resource/posts", event);
  });

  it("all four lock methods reject when no LockProvider is configured", async () => {
    const dp = realtimeDataProvider(baseProvider(), baseTransport());

    await expect(dp.lock("posts", { id: 1, identity: "ada" })).rejects.toThrow(
      "realtimeDataProvider: lock() called but no LockProvider was configured",
    );
    await expect(
      dp.unlock("posts", { id: 1, identity: "ada" }),
    ).rejects.toThrow(
      "realtimeDataProvider: unlock() called but no LockProvider was configured",
    );
    await expect(dp.getLock("posts", { id: 1 })).rejects.toThrow(
      "realtimeDataProvider: getLock() called but no LockProvider was configured",
    );
    await expect(dp.getLocks("posts", {})).rejects.toThrow(
      "realtimeDataProvider: getLocks() called but no LockProvider was configured",
    );
  });

  it("lock, unlock, getLock and getLocks delegate to the LockProvider", async () => {
    const locks = lockProvider();
    const dp = realtimeDataProvider(baseProvider(), baseTransport(), {
      locks,
    });

    await expect(dp.lock("posts", { id: 1, identity: "ada" })).resolves.toBe(
      aLock,
    );
    await dp.unlock("posts", { id: 1, identity: "ada" });
    await dp.getLock("posts", { id: 1 });
    await expect(dp.getLocks("posts", {})).resolves.toEqual([aLock]);

    expect(locks.lock).toHaveBeenCalledWith("posts", {
      id: 1,
      identity: "ada",
    });
    expect(locks.unlock).toHaveBeenCalledWith("posts", {
      id: 1,
      identity: "ada",
    });
    expect(locks.getLock).toHaveBeenCalledWith("posts", { id: 1 });
    expect(locks.getLocks).toHaveBeenCalledWith("posts", {});
  });

  it("forwards onReconnect, onStatusChange, getStatus and onError only when the transport has them", () => {
    const bare = realtimeDataProvider(baseProvider(), baseTransport());
    expect("onReconnect" in bare).toBe(false);
    expect("onStatusChange" in bare).toBe(false);
    expect("getStatus" in bare).toBe(false);
    expect("onError" in bare).toBe(false);

    const off = vi.fn();
    const status: RealtimeConnectionStatus = "connected";
    const transport: RealtimeTransport = {
      ...baseTransport(),
      onReconnect: vi.fn(() => off),
      onStatusChange: vi.fn(() => off),
      getStatus: vi.fn(() => status),
      onError: vi.fn(() => off),
    };
    const dp = realtimeDataProvider(baseProvider(), transport);
    const cb = vi.fn();

    expect(dp.onReconnect?.(cb)).toBe(off);
    expect(dp.onStatusChange?.(cb)).toBe(off);
    expect(dp.onError?.(cb)).toBe(off);
    expect(dp.getStatus?.()).toBe("connected");
    expect(transport.onReconnect).toHaveBeenCalledWith(cb);
    expect(transport.onStatusChange).toHaveBeenCalledWith(cb);
    expect(transport.onError).toHaveBeenCalledWith(cb);
  });

  it("wraps a provider built by combineDataProviders and keeps its verbs", async () => {
    const posts = baseProvider();
    const combined = combineDataProviders(() => posts);
    const dp = realtimeDataProvider(combined, baseTransport());

    await expect(dp.getOne("posts", { id: 1 })).resolves.toEqual({
      data: { id: "getOne" },
    });
    expect(posts.getOne).toHaveBeenCalledWith("posts", { id: 1 });
    expect(isRealtimeDataProvider(dp)).toBe(true);
  });
});

describe("isRealtimeDataProvider", () => {
  it("is true for a wrapped provider and false for a plain one", () => {
    const plain = baseProvider();
    expect(isRealtimeDataProvider(plain)).toBe(false);
    expect(
      isRealtimeDataProvider(realtimeDataProvider(plain, baseTransport())),
    ).toBe(true);
  });
});

describe("assertRealtimeDataProvider", () => {
  it("names the caller in the error for a plain provider", () => {
    expect(() =>
      assertRealtimeDataProvider(baseProvider(), "useSubscribe"),
    ).toThrow(
      "useSubscribe: dataProvider does not implement subscribe(). Wrap it with realtimeDataProvider().",
    );
    expect(() =>
      assertRealtimeDataProvider(
        realtimeDataProvider(baseProvider(), baseTransport()),
        "useSubscribe",
      ),
    ).not.toThrow();
  });
});

describe("LockConflictError", () => {
  it("carries the existing lock and names the record and holder", () => {
    const error = new LockConflictError(aLock);

    expect(error).toBeInstanceOf(Error);
    expect(error.kind).toBe("LockConflictError");
    expect(error.existingLock).toBe(aLock);
    expect(error.message).toBe("Resource posts/1 is locked by ada");
  });
});
