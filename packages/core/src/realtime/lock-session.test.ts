import { describe, expect, it, vi } from "vitest";
import type { AuthProvider } from "../auth/types";
import { inMemoryLockProvider } from "./in-memory-lock-provider";
import {
  createLockSession,
  type LockSessionDataProvider,
  resolveLockIdentity,
} from "./lock-session";
import { memoryTransport } from "./memory-transport";
import { type Lock, LockConflictError } from "./types";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const lockOf = (identity: string): Lock => ({
  resource: "posts",
  recordId: 1,
  identity,
  createdAt: "2026-01-01T00:00:00.000Z",
});

/** A whole `AuthProvider` whose verbs are no-ops unless the test overrides them. */
const authProviderWith = (overrides: Partial<AuthProvider>): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  ...overrides,
});

const setup = (overrides: Partial<LockSessionDataProvider> = {}) => {
  const locks = inMemoryLockProvider({ publisher: memoryTransport() });
  const dataProvider: LockSessionDataProvider = {
    lock: vi.fn(locks.lock),
    unlock: vi.fn(locks.unlock),
    ...overrides,
  };
  const onError = vi.fn();
  const session = createLockSession({
    dataProvider,
    resource: "posts",
    id: 1,
    getIdentity: async () => "ada",
    onError,
  });
  return { locks, dataProvider, onError, session };
};

describe("createLockSession", () => {
  it("start takes the lock and stores it", async () => {
    const { locks, session } = setup();

    const started = session.start();
    expect(session.store.getSnapshot()).toEqual({
      lock: null,
      isLocking: true,
      error: null,
    });
    await started;

    const held = await locks.getLock("posts", { id: 1 });
    expect(held).toMatchObject({ identity: "ada" });
    expect(session.store.getSnapshot()).toEqual({
      lock: held,
      isLocking: false,
      error: null,
    });
  });

  it("stop releases the lock with the identity it was taken under", async () => {
    let identity = "ada";
    const { locks, dataProvider } = setup();
    const session = createLockSession({
      dataProvider,
      resource: "posts",
      id: 1,
      meta: { source: "edit" },
      getIdentity: async () => identity,
    });
    await session.start();
    identity = "grace";

    await session.stop();

    expect(dataProvider.unlock).toHaveBeenCalledWith("posts", {
      id: 1,
      identity: "ada",
      meta: { source: "edit" },
    });
    await expect(locks.getLock("posts", { id: 1 })).resolves.toBeNull();
    expect(session.store.getSnapshot().lock).toBeNull();
  });

  it("a conflict sets error with the existing lock and calls onError", async () => {
    const { locks, onError, session } = setup();
    const existing = await locks.lock("posts", { id: 1, identity: "grace" });

    await session.start();

    const { error, lock, isLocking } = session.store.getSnapshot();
    expect(error).toBeInstanceOf(LockConflictError);
    if (!(error instanceof LockConflictError)) throw error;
    expect(error.existingLock).toEqual(existing);
    expect(lock).toBeNull();
    expect(isLocking).toBe(false);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("stop before the lock call resolves releases the lock once it lands", async () => {
    const landing = deferred<Lock>();
    const { dataProvider, session } = setup({ lock: () => landing.promise });

    const started = session.start();
    const stopped = session.stop();
    landing.resolve(lockOf("ada"));
    await Promise.all([started, stopped]);

    expect(dataProvider.unlock).toHaveBeenCalledWith("posts", {
      id: 1,
      identity: "ada",
    });
    expect(session.store.getSnapshot()).toEqual({
      lock: null,
      isLocking: false,
      error: null,
    });
  });

  it("start, stop and start in one tick ends holding the lock", async () => {
    const { locks, session } = setup();

    await Promise.all([session.start(), session.stop(), session.start()]);

    const held = await locks.getLock("posts", { id: 1 });
    expect(held).toMatchObject({ identity: "ada" });
    expect(session.store.getSnapshot().lock).toEqual(held);
  });

  it("a result after stop does not reach the store or onError", async () => {
    const landing = deferred<Lock>();
    const { onError, session } = setup({ lock: () => landing.promise });
    const started = session.start();
    const stopped = session.stop();

    landing.reject(new Error("boom"));
    await Promise.all([started, stopped]);

    expect(onError).not.toHaveBeenCalled();
    expect(session.store.getSnapshot()).toEqual({
      lock: null,
      isLocking: false,
      error: null,
    });
  });

  it("a failed release goes to onError", async () => {
    const failure = new Error("unlock failed");
    const { onError, session } = setup({
      unlock: () => Promise.reject(failure),
    });
    await session.start();

    await session.stop();

    expect(onError).toHaveBeenCalledWith(failure);
  });

  it("keeps working after an onError that throws", async () => {
    const { locks, dataProvider } = setup();
    const session = createLockSession({
      dataProvider,
      resource: "posts",
      id: 1,
      getIdentity: async () => "ada",
      onError: () => {
        throw new Error("handler bug");
      },
    });
    await locks.lock("posts", { id: 1, identity: "grace" });
    await session.start();
    await session.stop();

    await locks.unlock("posts", { id: 1, identity: "grace" });
    await session.start();

    expect(session.store.getSnapshot().lock).toMatchObject({ identity: "ada" });
    await session.stop();
    await expect(locks.getLock("posts", { id: 1 })).resolves.toBeNull();
  });

  it("a failing getIdentity sets error and takes no lock", async () => {
    const failure = new Error("not signed in");
    const { dataProvider, onError } = setup();
    const session = createLockSession({
      dataProvider,
      resource: "posts",
      id: 1,
      getIdentity: () => Promise.reject(failure),
      onError,
    });

    await session.start();

    expect(dataProvider.lock).not.toHaveBeenCalled();
    expect(session.store.getSnapshot()).toEqual({
      lock: null,
      isLocking: false,
      error: failure,
    });
    expect(onError).toHaveBeenCalledWith(failure);
  });
});

describe("resolveLockIdentity", () => {
  it("prefers the explicit identity and needs no auth provider", async () => {
    await expect(resolveLockIdentity(undefined, "ada")).resolves.toBe("ada");
    await expect(resolveLockIdentity(undefined, 0)).resolves.toBe(0);
  });

  it("falls back to the auth provider identity and rejects when there is none", async () => {
    const authProvider = authProviderWith({
      getIdentity: async () => ({ id: "grace" }),
    });
    await expect(resolveLockIdentity(authProvider)).resolves.toBe("grace");

    const message =
      "no identity available. Pass identity explicitly or configure an authProvider.";
    await expect(resolveLockIdentity(undefined)).rejects.toThrow(message);
    // A provider that simply lacks the optional verb rejects the same way.
    await expect(resolveLockIdentity(authProviderWith({}))).rejects.toThrow(
      message,
    );
  });
});
