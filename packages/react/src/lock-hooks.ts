import {
  assertRealtimeDataProvider,
  createLockSession,
  type GetLockParams,
  getLockOptions,
  getLocksOptions,
  type Identifier,
  type Lock,
  type LockSessionState,
  type ResourceMap,
  resolveLockIdentity,
  subscribeLiveLock,
  subscribeLiveLocks,
} from "@chelone/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { useCheloneContext } from "./context";
import { useRecordContext } from "./record/record-context";
import { useResourceContext } from "./resource";
import { useEvent } from "./util/use-event";

export interface LockCallParams {
  id: Identifier;
  /** Defaults to the auth provider's identity. */
  identity?: Identifier;
  meta?: Record<string, unknown>;
}

interface LockCall {
  resource: string;
  params: LockCallParams;
}

export interface UseLockResult {
  /** Resolves to the lock; rejects with the error that `error` also holds. */
  lock: (resource: string, params: LockCallParams) => Promise<Lock>;
  isLoading: boolean;
  error: Error | null;
}

export interface UseUnlockResult {
  /** Resolves to the released lock; rejects with the error that `error` also holds. */
  unlock: (resource: string, params: LockCallParams) => Promise<Lock>;
  isLoading: boolean;
  error: Error | null;
}

// Not `useGetIdentity`: it throws without an auth provider, and an explicit identity must still work.
function useLockCall(
  caller: string,
  verb: "lock" | "unlock",
): {
  call: (resource: string, params: LockCallParams) => Promise<Lock>;
  isLoading: boolean;
  error: Error | null;
} {
  const { dataProvider, authProvider } = useCheloneContext();
  const mutation = useMutation<Lock, Error, LockCall>({
    mutationFn: async ({ resource, params }) => {
      assertRealtimeDataProvider(dataProvider, caller);
      const { id, identity, meta } = params;
      const resolved = await resolveLockIdentity(authProvider, identity);
      return dataProvider[verb](resource, {
        id,
        identity: resolved,
        ...(meta ? { meta } : {}),
      });
    },
  });
  const { mutateAsync } = mutation;
  const call = useCallback(
    (resource: string, params: LockCallParams) =>
      mutateAsync({ resource, params }),
    [mutateAsync],
  );
  return { call, isLoading: mutation.isPending, error: mutation.error };
}

/** Takes a record's lock for an identity. */
export function useLock(): UseLockResult {
  const { call, isLoading, error } = useLockCall("useLock", "lock");
  return { lock: call, isLoading, error };
}

/** Releases a record's lock for the identity that holds it. */
export function useUnlock(): UseUnlockResult {
  const { call, isLoading, error } = useLockCall("useUnlock", "unlock");
  return { unlock: call, isLoading, error };
}

export interface UseGetLockOptions {
  enabled?: boolean;
}

/** One record's lock; `data` is `null` when the record is free. */
export function useGetLock<TResources extends ResourceMap = ResourceMap>(
  resource: keyof TResources & string,
  params: GetLockParams,
  options: UseGetLockOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery({ ...getLockOptions(ctx, resource, params), ...options });
}

/** Every lock held on a resource. */
export function useGetLocks<TResources extends ResourceMap = ResourceMap>(
  resource: keyof TResources & string,
  options: UseGetLockOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery({ ...getLocksOptions(ctx, resource), ...options });
}

/** `useGetLock` that refetches when the lock is taken or released. */
export function useGetLockLive<TResources extends ResourceMap = ResourceMap>(
  resource: keyof TResources & string,
  params: GetLockParams,
  options: UseGetLockOptions = {},
) {
  const { dataProvider, queryClient } = useCheloneContext<TResources>();
  const result = useGetLock<TResources>(resource, params, options);
  const live = options.enabled !== false;
  const { id } = params;

  useEffect(() => {
    if (!live) return;
    const subscription = subscribeLiveLock(
      { dataProvider, queryClient },
      resource,
      id,
    );
    return () => subscription.stop();
  }, [dataProvider, queryClient, resource, id, live]);

  return result;
}

/** `useGetLocks` that refetches when any lock of the resource is taken or released. */
export function useGetLocksLive<TResources extends ResourceMap = ResourceMap>(
  resource: keyof TResources & string,
  options: UseGetLockOptions = {},
) {
  const { dataProvider, queryClient } = useCheloneContext<TResources>();
  const result = useGetLocks<TResources>(resource, options);
  const live = options.enabled !== false;

  useEffect(() => {
    if (!live) return;
    const subscription = subscribeLiveLocks(
      { dataProvider, queryClient },
      resource,
    );
    return () => subscription.stop();
  }, [dataProvider, queryClient, resource, live]);

  return result;
}

export interface UseLockOnMountOptions {
  /** Defaults to the resource context. */
  resource?: string;
  /** Defaults to the id of the record context. */
  id?: Identifier;
  /** Defaults to the auth provider's identity. */
  identity?: Identifier;
  meta?: Record<string, unknown>;
  /** Called with a failed lock or release. A new function every render never relocks. */
  onLockError?: (error: Error) => void;
}

export interface UseLockOnMountResult {
  lock: Lock | null;
  isLocking: boolean;
  lockError: Error | null;
}

const IDLE_STATE: LockSessionState = {
  lock: null,
  isLocking: false,
  error: null,
};
const idleStore = {
  subscribe: () => () => {},
  getSnapshot: () => IDLE_STATE,
};

/**
 * Holds a record's lock while the component is mounted. Resource and id come
 * from the options or the contexts; with either missing it takes no lock.
 * Changing the data provider, resource, id or identity releases the old lock
 * before it takes the next.
 */
export function useLockOnMount({
  resource: resourceOption,
  id: idOption,
  identity,
  meta,
  onLockError,
}: UseLockOnMountOptions = {}): UseLockOnMountResult {
  const { dataProvider, authProvider } = useCheloneContext();
  const resource = useResourceContext({ resource: resourceOption });
  const record = useRecordContext();
  const id = idOption ?? record?.id;

  // A new `meta` or `authProvider` never relocks: the session reads them as they were when it was made.
  const latest = useRef({ meta, authProvider });
  latest.current = { meta, authProvider };
  const reportError = useEvent((error: Error) => onLockError?.(error));

  const session = useMemo(() => {
    if (!resource || id === undefined || id === null) return null;
    assertRealtimeDataProvider(dataProvider, "useLockOnMount");
    return createLockSession({
      dataProvider,
      resource,
      id,
      getIdentity: () =>
        resolveLockIdentity(latest.current.authProvider, identity),
      meta: latest.current.meta,
      onError: reportError,
    });
  }, [dataProvider, resource, id, identity, reportError]);

  useEffect(() => {
    if (!session) return;
    void session.start();
    return () => void session.stop();
  }, [session]);

  const store = session?.store ?? idleStore;
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  return {
    lock: state.lock,
    isLocking: state.isLocking,
    lockError: state.error,
  };
}
