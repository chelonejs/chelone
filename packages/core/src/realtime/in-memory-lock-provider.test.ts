import { describe, expect, it, vi } from "vitest";
import { InertDataProvider } from "../__fixtures__/data-provider";
import { inMemoryLockProvider } from "./in-memory-lock-provider";
import { memoryTransport } from "./memory-transport";
import { realtimeDataProvider } from "./realtime-data-provider";
import { lockResourceTopic, lockTopic } from "./topics";
import { LockConflictError } from "./types";

const setup = () => {
  const transport = memoryTransport();
  const locks = inMemoryLockProvider({ publisher: transport });
  return { transport, locks };
};

describe("inMemoryLockProvider", () => {
  it("locks an unlocked record", async () => {
    const { locks } = setup();

    const lock = await locks.lock("posts", { id: 1, identity: "ada" });

    expect(lock).toEqual({
      resource: "posts",
      recordId: 1,
      identity: "ada",
      createdAt: expect.any(String),
    });
    expect(new Date(lock.createdAt).toISOString()).toBe(lock.createdAt);
    await expect(locks.getLock("posts", { id: 1 })).resolves.toEqual(lock);
    await expect(locks.getLock("posts", { id: 2 })).resolves.toBeNull();
  });

  it("throws LockConflictError when another identity holds the lock", async () => {
    const { locks } = setup();
    const held = await locks.lock("posts", { id: 1, identity: "ada" });

    const attempt = locks.lock("posts", { id: 1, identity: "grace" });

    await expect(attempt).rejects.toBeInstanceOf(LockConflictError);
    await expect(attempt).rejects.toMatchObject({ existingLock: held });
    await expect(locks.getLock("posts", { id: 1 })).resolves.toEqual(held);
  });

  it("is idempotent for the same identity and publishes once", async () => {
    const { locks, transport } = setup();

    const first = await locks.lock("posts", { id: 1, identity: "ada" });
    const second = await locks.lock("posts", { id: 1, identity: "ada" });

    expect(second).toEqual(first);
    expect(transport.publishedEvents.map((e) => e.topic)).toEqual([
      lockTopic("posts", 1),
      lockResourceTopic("posts"),
    ]);
  });

  it('treats 1 and "1" as the same identity', async () => {
    const { locks } = setup();
    const held = await locks.lock("posts", { id: 1, identity: 1 });

    await expect(
      locks.lock("posts", { id: 1, identity: "1" }),
    ).resolves.toEqual(held);
    await expect(
      locks.unlock("posts", { id: 1, identity: "1" }),
    ).resolves.toEqual(held);
  });

  it("unlock releases the lock and publishes unlocked on both topics", async () => {
    const { locks, transport } = setup();
    const held = await locks.lock("posts", { id: 1, identity: "ada" });
    const onRecord = vi.fn();
    const onResource = vi.fn();
    transport.subscribe(lockTopic("posts", 1), onRecord);
    transport.subscribe(lockResourceTopic("posts"), onResource);

    await expect(
      locks.unlock("posts", { id: 1, identity: "ada" }),
    ).resolves.toEqual(held);

    await expect(locks.getLock("posts", { id: 1 })).resolves.toBeNull();
    expect(onRecord).toHaveBeenCalledExactlyOnceWith({
      topic: lockTopic("posts", 1),
      type: "unlocked",
      payload: held,
    });
    expect(onResource).toHaveBeenCalledExactlyOnceWith({
      topic: lockResourceTopic("posts"),
      type: "unlocked",
      payload: held,
    });
    await expect(
      locks.lock("posts", { id: 1, identity: "grace" }),
    ).resolves.toMatchObject({ identity: "grace" });
  });

  it("unlock throws when no lock exists or another identity holds it", async () => {
    const { locks } = setup();

    const missing = locks.unlock("posts", { id: 7, identity: "ada" });
    await expect(missing).rejects.toThrow(/posts.*7/);
    await expect(missing).rejects.not.toBeInstanceOf(LockConflictError);

    await locks.lock("posts", { id: 1, identity: "ada" });
    await expect(
      locks.unlock("posts", { id: 1, identity: "grace" }),
    ).rejects.toBeInstanceOf(LockConflictError);
    await expect(locks.getLock("posts", { id: 1 })).resolves.not.toBeNull();
  });

  it("getLocks returns only the locks of the resource", async () => {
    const { locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ada" });
    await locks.lock("posts", { id: 2, identity: "grace" });
    await locks.lock("users", { id: 1, identity: "ada" });
    // A resource name holding "::" must not collide with another resource.
    await locks.lock("posts::1", { id: 2, identity: "ada" });

    const posts = await locks.getLocks("posts");

    expect(posts.map((l) => [l.resource, l.recordId])).toEqual([
      ["posts", 1],
      ["posts", 2],
    ]);
    await expect(locks.getLocks("comments")).resolves.toEqual([]);
    await expect(locks.getLock("posts", { id: "1::2" })).resolves.toBeNull();
  });

  it("works without a publisher", async () => {
    const locks = inMemoryLockProvider();

    await expect(
      locks.lock("posts", { id: 1, identity: "ada" }),
    ).resolves.toMatchObject({ identity: "ada" });
  });

  it("a lock taken through realtimeDataProvider reaches a lockTopic subscriber", async () => {
    const { locks, transport } = setup();
    const dp = realtimeDataProvider(new InertDataProvider(), transport, {
      locks,
    });
    const callback = vi.fn();
    dp.subscribe(lockTopic("posts", 1), callback);

    const lock = await dp.lock("posts", { id: 1, identity: "ada" });

    expect(callback).toHaveBeenCalledExactlyOnceWith({
      topic: lockTopic("posts", 1),
      type: "locked",
      payload: lock,
    });
  });
});
