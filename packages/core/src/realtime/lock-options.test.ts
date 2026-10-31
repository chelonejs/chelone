import { QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import type { DataProvider } from "../data/types";
import { getLockOptions, getLocksOptions } from "./lock-options";
import { realtimeDataProvider } from "./realtime-data-provider";
import type { Lock, LockProvider } from "./types";

const aLock: Lock = {
  resource: "posts",
  recordId: 1,
  identity: "ada",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const setup = () => {
  const locks: LockProvider = {
    lock: vi.fn(),
    unlock: vi.fn(),
    getLock: vi.fn(async () => aLock),
    getLocks: vi.fn(async () => [aLock]),
  };
  const dataProvider = realtimeDataProvider(
    {} as DataProvider,
    { subscribe: () => () => {}, publish: async () => {} },
    { locks },
  );
  return { locks, ctx: { dataProvider, queryClient: new QueryClient() } };
};

describe("getLockOptions", () => {
  it("queryFn reads the lock from the data provider", async () => {
    const { ctx, locks } = setup();
    const options = getLockOptions(ctx, "posts", { id: 1 });

    expect(options.queryKey).toEqual(["posts", "getLock", { id: "1" }]);
    await expect(options.queryFn()).resolves.toEqual(aLock);
    expect(locks.getLock).toHaveBeenCalledWith("posts", { id: 1 });
  });

  it("fails with a clear message on a plain data provider", () => {
    const ctx = {
      dataProvider: {} as DataProvider,
      queryClient: new QueryClient(),
    };

    expect(() => getLockOptions(ctx, "posts", { id: 1 })).toThrow(
      /getLockOptions: dataProvider does not implement subscribe\(\)/,
    );
  });
});

describe("getLocksOptions", () => {
  it("queryFn reads the locks of the resource", async () => {
    const { ctx, locks } = setup();
    const options = getLocksOptions(ctx, "posts");

    expect(options.queryKey).toEqual(["posts", "getLocks"]);
    await expect(options.queryFn()).resolves.toEqual([aLock]);
    expect(locks.getLocks).toHaveBeenCalledWith("posts", undefined);
  });
});
