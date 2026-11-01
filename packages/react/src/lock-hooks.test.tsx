import {
  type AuthProvider,
  fakeDataProvider,
  inMemoryLockProvider,
  LockConflictError,
  memoryTransport,
  realtimeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "./context";
import {
  useGetLock,
  useGetLockLive,
  useGetLocks,
  useGetLocksLive,
  useLock,
  useLockOnMount,
  useUnlock,
} from "./lock-hooks";
import { RecordContextProvider } from "./record/record-context";
import { ResourceContextProvider } from "./resource";

function setup(authProvider?: AuthProvider) {
  const transport = memoryTransport();
  const locks = inMemoryLockProvider({ publisher: transport });
  const dataProvider = realtimeDataProvider(fakeDataProvider({}), transport, {
    locks,
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={new QueryClient()}
      authProvider={authProvider}
    >
      {children}
    </CheloneProvider>
  );
  return { dataProvider, locks, wrapper };
}

const authAs = (id: string): AuthProvider =>
  ({
    getIdentity: async () => ({ id }),
  }) as unknown as AuthProvider;

describe("useLock", () => {
  it("locks with the explicit identity and no auth provider", async () => {
    const { wrapper, locks } = setup();
    const { result } = renderHook(() => useLock(), { wrapper });

    let lock: Awaited<ReturnType<typeof result.current.lock>> | undefined;
    await act(async () => {
      lock = await result.current.lock("posts", { id: 1, identity: "ann" });
    });

    expect(lock).toMatchObject({
      resource: "posts",
      recordId: 1,
      identity: "ann",
    });
    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "ann",
    });
  });

  it("falls back to the auth provider identity", async () => {
    const { wrapper, locks } = setup(authAs("bob"));
    const { result } = renderHook(() => useLock(), { wrapper });

    await act(() => result.current.lock("posts", { id: 1 }));

    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "bob",
    });
  });

  it("rejects with a clear error when no identity is available", async () => {
    const { wrapper, locks } = setup();
    const { result } = renderHook(() => useLock(), { wrapper });

    let caught: unknown;
    await act(async () => {
      caught = await result.current.lock("posts", { id: 1 }).catch((e) => e);
    });

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/no identity available/);
    expect(await locks.getLock("posts", { id: 1 })).toBeNull();
  });

  it("a conflict is stored in error and rethrown", async () => {
    const { wrapper, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const { result } = renderHook(() => useLock(), { wrapper });

    let caught: unknown;
    await act(async () => {
      caught = await result.current
        .lock("posts", { id: 1, identity: "bob" })
        .catch((e) => e);
    });

    expect(caught).toBeInstanceOf(LockConflictError);
    await waitFor(() => expect(result.current.error).toBe(caught));
  });

  it("isLoading is true while the call is in flight", async () => {
    const { wrapper, locks } = setup();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = locks.lock.bind(locks);
    vi.spyOn(locks, "lock").mockImplementation(async (resource, params) => {
      await gate;
      return original(resource, params);
    });
    const { result } = renderHook(() => useLock(), { wrapper });
    expect(result.current.isLoading).toBe(false);

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.lock("posts", { id: 1, identity: "ann" });
    });
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      release();
      await pending;
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

describe("useUnlock", () => {
  it("releases a held lock", async () => {
    const { wrapper, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const { result } = renderHook(() => useUnlock(), { wrapper });

    let released: Awaited<ReturnType<typeof result.current.unlock>> | undefined;
    await act(async () => {
      released = await result.current.unlock("posts", {
        id: 1,
        identity: "ann",
      });
    });

    expect(released).toMatchObject({ recordId: 1, identity: "ann" });
    expect(await locks.getLock("posts", { id: 1 })).toBeNull();
  });

  it("rejects when another identity holds the lock", async () => {
    const { wrapper, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const { result } = renderHook(() => useUnlock(), { wrapper });

    let caught: unknown;
    await act(async () => {
      caught = await result.current
        .unlock("posts", { id: 1, identity: "bob" })
        .catch((e) => e);
    });

    expect(caught).toBeInstanceOf(LockConflictError);
    await waitFor(() => expect(result.current.error).toBe(caught));
    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "ann",
    });
  });
});

describe("useGetLock", () => {
  it("returns the current lock and null when the record is free", async () => {
    const { wrapper, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });

    const held = renderHook(() => useGetLock("posts", { id: 1 }), { wrapper });
    const free = renderHook(() => useGetLock("posts", { id: 2 }), { wrapper });

    await waitFor(() => expect(held.result.current.isSuccess).toBe(true));
    expect(held.result.current.data).toMatchObject({ identity: "ann" });
    await waitFor(() => expect(free.result.current.isSuccess).toBe(true));
    expect(free.result.current.data).toBeNull();
  });

  it("does not fetch when enabled is false", async () => {
    const { wrapper, dataProvider } = setup();
    const getLock = vi.spyOn(dataProvider, "getLock");

    const { result } = renderHook(
      () => useGetLock("posts", { id: 1 }, { enabled: false }),
      { wrapper },
    );

    await act(() => Promise.resolve());
    expect(getLock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useGetLocks", () => {
  it("returns every lock of the resource", async () => {
    const { wrapper, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    await locks.lock("posts", { id: 2, identity: "bob" });
    await locks.lock("users", { id: 1, identity: "ann" });

    const { result } = renderHook(() => useGetLocks("posts"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((lock) => lock.recordId)).toEqual([1, 2]);
  });
});

describe("useGetLockLive", () => {
  it("updates when the lock is released through the lock provider", async () => {
    const { wrapper, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const { result } = renderHook(() => useGetLockLive("posts", { id: 1 }), {
      wrapper,
    });
    await waitFor(() =>
      expect(result.current.data).toMatchObject({ identity: "ann" }),
    );

    await act(async () => {
      await locks.unlock("posts", { id: 1, identity: "ann" });
    });

    await waitFor(() => expect(result.current.data).toBeNull());
  });
});

describe("useGetLocksLive", () => {
  it("updates when a lock is taken", async () => {
    const { wrapper, locks } = setup();
    const { result } = renderHook(() => useGetLocksLive("posts"), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([]));

    await act(async () => {
      await locks.lock("posts", { id: 1, identity: "ann" });
    });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });
});

describe("useLockOnMount", () => {
  it("takes the lock on mount and releases it on unmount", async () => {
    const { wrapper, locks } = setup();
    const { result, unmount } = renderHook(
      () => useLockOnMount({ resource: "posts", id: 1, identity: "ann" }),
      { wrapper },
    );
    expect(result.current.isLocking).toBe(true);

    await waitFor(() =>
      expect(result.current.lock).toMatchObject({ identity: "ann" }),
    );
    expect(result.current).toMatchObject({ isLocking: false, lockError: null });
    expect(await locks.getLock("posts", { id: 1 })).toMatchObject({
      identity: "ann",
    });

    unmount();

    await waitFor(async () =>
      expect(await locks.getLock("posts", { id: 1 })).toBeNull(),
    );
  });

  it("reads resource and id from the resource and record contexts", async () => {
    const { wrapper: base, locks } = setup(authAs("bob"));
    const wrapper = ({ children }: { children: ReactNode }) =>
      base({
        children: (
          <ResourceContextProvider value="posts">
            <RecordContextProvider value={{ id: 7 }}>
              {children}
            </RecordContextProvider>
          </ResourceContextProvider>
        ),
      });

    renderHook(() => useLockOnMount(), { wrapper });

    await waitFor(async () =>
      expect(await locks.getLock("posts", { id: 7 })).toMatchObject({
        identity: "bob",
      }),
    );
  });

  it("surfaces a conflict when another identity holds the lock", async () => {
    const { wrapper, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const onLockError = vi.fn();

    const { result } = renderHook(
      () =>
        useLockOnMount({
          resource: "posts",
          id: 1,
          identity: "bob",
          onLockError,
        }),
      { wrapper },
    );

    await waitFor(() =>
      expect(result.current.lockError).toBeInstanceOf(LockConflictError),
    );
    expect(result.current).toMatchObject({ lock: null, isLocking: false });
    expect(onLockError).toHaveBeenCalledWith(result.current.lockError);
  });

  it("takes no lock without a resource, an id or an identity", async () => {
    const { wrapper, dataProvider } = setup();
    const lock = vi.spyOn(dataProvider, "lock");

    const noResource = renderHook(
      () => useLockOnMount({ id: 1, identity: "ann" }),
      { wrapper },
    );
    const noId = renderHook(
      () => useLockOnMount({ resource: "posts", identity: "ann" }),
      { wrapper },
    );
    const noIdentity = renderHook(
      () => useLockOnMount({ resource: "posts", id: 1 }),
      { wrapper },
    );

    const idle = { lock: null, isLocking: false, lockError: null };
    await act(() => Promise.resolve());
    expect(noResource.result.current).toEqual(idle);
    expect(noId.result.current).toEqual(idle);
    await waitFor(() =>
      expect(noIdentity.result.current.lockError).toBeTruthy(),
    );
    expect(noIdentity.result.current.lockError?.message).toMatch(
      /no identity available/,
    );
    expect(lock).not.toHaveBeenCalled();
  });

  it("releases a lock that lands after unmount", async () => {
    const { wrapper, locks } = setup();
    let land: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      land = resolve;
    });
    const original = locks.lock.bind(locks);
    vi.spyOn(locks, "lock").mockImplementation(async (resource, params) => {
      await gate;
      return original(resource, params);
    });

    const { unmount } = renderHook(
      () => useLockOnMount({ resource: "posts", id: 1, identity: "ann" }),
      { wrapper },
    );
    unmount();
    land();

    await waitFor(async () =>
      expect(await locks.getLocks("posts")).toEqual([]),
    );
    expect(locks.lock).toHaveBeenCalledTimes(1);
  });

  it("under StrictMode ends holding exactly one lock", async () => {
    const { wrapper: base, locks } = setup();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{base({ children })}</StrictMode>
    );

    const { result } = renderHook(
      () => useLockOnMount({ resource: "posts", id: 1, identity: "ann" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.lock).not.toBeNull());
    expect(await locks.getLocks("posts")).toHaveLength(1);
  });

  it("calls the latest onLockError without relocking", async () => {
    const { wrapper, locks } = setup();
    await locks.lock("posts", { id: 1, identity: "ann" });
    const lockSpy = vi.spyOn(locks, "lock");
    const first = vi.fn();
    const second = vi.fn();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    lockSpy.mockImplementation(async (resource, params) => {
      await gate;
      throw new LockConflictError({
        resource,
        recordId: params.id,
        identity: "ann",
        createdAt: "",
      });
    });

    const { rerender } = renderHook(
      ({ onLockError }) =>
        useLockOnMount({
          resource: "posts",
          id: 1,
          identity: "bob",
          onLockError,
        }),
      { wrapper, initialProps: { onLockError: first } },
    );
    rerender({ onLockError: second });
    rerender({ onLockError: vi.fn() });
    const third = vi.fn();
    rerender({ onLockError: third });
    release();

    await waitFor(() => expect(third).toHaveBeenCalledTimes(1));
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(lockSpy).toHaveBeenCalledTimes(1);
  });

  it("releases the old lock before taking one for a new id", async () => {
    const { wrapper, locks } = setup();
    const calls: string[] = [];
    const lock = locks.lock.bind(locks);
    const unlock = locks.unlock.bind(locks);
    vi.spyOn(locks, "lock").mockImplementation((resource, params) => {
      calls.push(`lock ${String(params.id)}`);
      return lock(resource, params);
    });
    vi.spyOn(locks, "unlock").mockImplementation((resource, params) => {
      calls.push(`unlock ${String(params.id)}`);
      return unlock(resource, params);
    });

    const { result, rerender } = renderHook(
      ({ id }) => useLockOnMount({ resource: "posts", id, identity: "ann" }),
      { wrapper, initialProps: { id: 1 } },
    );
    await waitFor(() => expect(result.current.lock?.recordId).toBe(1));

    rerender({ id: 2 });

    await waitFor(() => expect(result.current.lock?.recordId).toBe(2));
    expect(calls).toEqual(["lock 1", "unlock 1", "lock 2"]);
    expect((await locks.getLocks("posts")).map((l) => l.recordId)).toEqual([2]);
  });

  it("waits for a lock still in flight to be released before taking the next", async () => {
    const { wrapper, locks } = setup();
    const calls: string[] = [];
    let land: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      land = resolve;
    });
    const lock = locks.lock.bind(locks);
    const unlock = locks.unlock.bind(locks);
    vi.spyOn(locks, "lock").mockImplementation(async (resource, params) => {
      calls.push(`lock ${String(params.id)} ${String(params.identity)}`);
      if (params.identity === "ann") await gate;
      return lock(resource, params);
    });
    vi.spyOn(locks, "unlock").mockImplementation((resource, params) => {
      calls.push(`unlock ${String(params.id)} ${String(params.identity)}`);
      return unlock(resource, params);
    });

    const { result, rerender } = renderHook(
      ({ identity }) => useLockOnMount({ resource: "posts", id: 1, identity }),
      { wrapper, initialProps: { identity: "ann" } },
    );
    await waitFor(() => expect(calls).toEqual(["lock 1 ann"]));
    rerender({ identity: "bob" });
    land();

    await waitFor(() => expect(result.current.lock?.identity).toBe("bob"));
    expect(calls).toEqual(["lock 1 ann", "unlock 1 ann", "lock 1 bob"]);
    expect(result.current.lockError).toBeNull();
  });
});
