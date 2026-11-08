import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { DataContext } from "../data/query-options";
import type { DataProvider } from "../data/types";
import { defineResources } from "../resource/registry";
import { addEventsForMutations } from "./add-events-for-mutations";
import { inMemoryLockProvider } from "./in-memory-lock-provider";
import {
  subscribeLiveLock,
  subscribeLiveLocks,
  subscribeLiveRecord,
  subscribeLiveRecords,
  subscribeLiveResource,
} from "./live";
import type { Lock, LockProvider, RealtimeDataProvider } from "./types";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Resources = typeof resources;

declare const withReconnect: DataProvider<Resources> & {
  reconnect(): Promise<void>;
};
declare const realtime: RealtimeDataProvider<Resources>;
declare const plain: DataProvider<Resources>;
declare const ctx: DataContext<Resources>;
declare const looseCtx: DataContext;
declare const resourceName: string;
declare const locks: LockProvider<Resources>;

describe("realtime types", () => {
  it("live subscriptions accept only the context's resource names", () => {
    subscribeLiveResource(ctx, "posts");
    subscribeLiveRecord(ctx, "posts", 1);
    subscribeLiveRecords(ctx, "posts", [1, 2]);
    subscribeLiveLock(ctx, "posts", 1);
    subscribeLiveLocks(ctx, "posts");

    // @ts-expect-error Not a resource in the context.
    subscribeLiveResource(ctx, "psots");
    // @ts-expect-error Not a resource in the context.
    subscribeLiveRecord(ctx, "psots", 1);
    // @ts-expect-error Not a resource in the context.
    subscribeLiveRecords(ctx, "psots", [1, 2]);
    // @ts-expect-error Not a resource in the context.
    subscribeLiveLock(ctx, "psots", 1);
    // @ts-expect-error Not a resource in the context.
    subscribeLiveLocks(ctx, "psots");
  });

  it("live subscriptions accept any string with a plain DataContext", () => {
    subscribeLiveResource(looseCtx, resourceName);
    subscribeLiveRecord(looseCtx, resourceName, 1);
    subscribeLiveRecords(looseCtx, resourceName, [1, 2]);
    subscribeLiveLock(looseCtx, resourceName, 1);
    subscribeLiveLocks(looseCtx, resourceName);
  });

  it("lock verbs accept only the provider's resource names", () => {
    expectTypeOf(
      locks.lock("posts", { id: 1, identity: "alice" }),
    ).toEqualTypeOf<Promise<Lock>>();
    expectTypeOf(
      locks.unlock("posts", { id: 1, identity: "alice" }),
    ).toEqualTypeOf<Promise<Lock>>();
    expectTypeOf(locks.getLock("posts", { id: 1 })).toEqualTypeOf<
      Promise<Lock | null>
    >();
    expectTypeOf(locks.getLocks("posts")).toEqualTypeOf<Promise<Lock[]>>();

    // @ts-expect-error Not a resource in the provider.
    locks.lock("psots", { id: 1, identity: "alice" });
    // @ts-expect-error Not a resource in the provider.
    locks.unlock("psots", { id: 1, identity: "alice" });
    // @ts-expect-error Not a resource in the provider.
    locks.getLock("psots", { id: 1 });
    // @ts-expect-error Not a resource in the provider.
    locks.getLocks("psots");

    realtime.lock("posts", { id: 1, identity: "alice" });
    realtime.unlock("posts", { id: 1, identity: "alice" });
    realtime.getLock("posts", { id: 1 });
    realtime.getLocks("posts");

    // @ts-expect-error Not a resource in the provider.
    realtime.lock("psots", { id: 1, identity: "alice" });
    // @ts-expect-error Not a resource in the provider.
    realtime.unlock("psots", { id: 1, identity: "alice" });
    // @ts-expect-error Not a resource in the provider.
    realtime.getLock("psots", { id: 1 });
    // @ts-expect-error Not a resource in the provider.
    realtime.getLocks("psots");
  });

  it("a bare LockProvider keeps accepting any string", () => {
    const provider: LockProvider = inMemoryLockProvider();
    expectTypeOf(provider).toExtend<LockProvider<Resources>>();
    expectTypeOf(
      provider.lock(resourceName, { id: 1, identity: "alice" }),
    ).toEqualTypeOf<Promise<Lock>>();
    expectTypeOf(
      provider.unlock(resourceName, { id: 1, identity: "alice" }),
    ).toEqualTypeOf<Promise<Lock>>();
    expectTypeOf(provider.getLock(resourceName, { id: 1 })).toEqualTypeOf<
      Promise<Lock | null>
    >();
    expectTypeOf(provider.getLocks(resourceName)).toEqualTypeOf<
      Promise<Lock[]>
    >();
  });

  it("a RealtimeDataProvider is assignable to DataProvider", () => {
    expectTypeOf<RealtimeDataProvider<Resources>>().toExtend<
      DataProvider<Resources>
    >();
    expectTypeOf<DataProvider<Resources>>().not.toExtend<
      RealtimeDataProvider<Resources>
    >();
  });

  it("addEventsForMutations keeps the RealtimeDataProvider type", () => {
    expectTypeOf(addEventsForMutations(realtime, realtime)).toEqualTypeOf<
      RealtimeDataProvider<Resources>
    >();

    expectTypeOf(addEventsForMutations(plain, realtime)).toEqualTypeOf<
      DataProvider<Resources>
    >();
  });

  it("addEventsForMutations keeps a provider's extra members", () => {
    const wrapped = addEventsForMutations(withReconnect, realtime);
    expectTypeOf(wrapped).toEqualTypeOf<typeof withReconnect>();
    expectTypeOf(wrapped.reconnect).toEqualTypeOf<() => Promise<void>>();
  });
});
