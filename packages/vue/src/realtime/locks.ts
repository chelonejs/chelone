import {
  assertRealtimeDataProvider,
  createLockSession,
  createMicroStore,
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
import { useMutation, useQuery } from "@tanstack/vue-query";
import { computed, type MaybeRefOrGetter, toValue, watchEffect } from "vue";
import { useCheloneContext } from "../context";
import { useRecordContext } from "../record/record-context";
import { useResourceContext } from "../resource-context";
import { useMicroStore } from "../store/use-micro-store";

interface LockCallParams {
  id: Identifier;
  /** Defaults to the auth provider's identity. */
  identity?: Identifier;
  meta?: Record<string, unknown>;
}

interface LockReadOptions {
  /** Gates the fetch, and the subscription of the live variants. */
  enabled?: MaybeRefOrGetter<boolean>;
}

const isEnabled = (enabled: LockReadOptions["enabled"]) =>
  enabled === undefined || toValue(enabled);

/** Takes a record's lock. Rejects, and stores the error, when another identity holds it. */
export function useLock() {
  const { dataProvider, authProvider } = useCheloneContext();
  const mutation = useMutation({
    mutationFn: async ({
      resource,
      id,
      identity,
      meta,
    }: LockCallParams & { resource: string }) => {
      assertRealtimeDataProvider(dataProvider, "useLock");
      return dataProvider.lock(resource, {
        id,
        identity: await resolveLockIdentity(authProvider, identity),
        ...(meta ? { meta } : {}),
      });
    },
  });
  return {
    lock: (resource: string, params: LockCallParams): Promise<Lock> =>
      mutation.mutateAsync({ resource, ...params }),
    isLoading: computed(() => mutation.isPending.value),
    error: computed(() => mutation.error.value),
  };
}

/** Releases a record's lock. Rejects, and stores the error, when another identity holds it. */
export function useUnlock() {
  const { dataProvider, authProvider } = useCheloneContext();
  const mutation = useMutation({
    mutationFn: async ({
      resource,
      id,
      identity,
      meta,
    }: LockCallParams & { resource: string }) => {
      assertRealtimeDataProvider(dataProvider, "useUnlock");
      return dataProvider.unlock(resource, {
        id,
        identity: await resolveLockIdentity(authProvider, identity),
        ...(meta ? { meta } : {}),
      });
    },
  });
  return {
    unlock: (resource: string, params: LockCallParams): Promise<Lock> =>
      mutation.mutateAsync({ resource, ...params }),
    isLoading: computed(() => mutation.isPending.value),
    error: computed(() => mutation.error.value),
  };
}

/** One record's lock, or `null` when it is free. */
export function useGetLock<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: MaybeRefOrGetter<GetLockParams>,
  options: LockReadOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  return useQuery(
    computed(() => ({
      ...getLockOptions(ctx, resource, toValue(params)),
      enabled: isEnabled(options.enabled),
    })),
  );
}

/** Every lock held on a resource. */
export function useGetLocks<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(resource: TName, options: LockReadOptions = {}) {
  const ctx = useCheloneContext<TResources>();
  return useQuery(
    computed(() => ({
      ...getLocksOptions(ctx, resource),
      enabled: isEnabled(options.enabled),
    })),
  );
}

/** `useGetLock`, kept fresh: refetches when the lock is taken or released, or the connection comes back. */
export function useGetLockLive<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  resource: TName,
  params: MaybeRefOrGetter<GetLockParams>,
  options: LockReadOptions = {},
) {
  const ctx = useCheloneContext<TResources>();
  const query = useGetLock<TResources, TName>(resource, params, options);
  watchEffect((onCleanup) => {
    if (!isEnabled(options.enabled)) return;
    onCleanup(subscribeLiveLock(ctx, resource, toValue(params).id).stop);
  });
  return query;
}

/** `useGetLocks`, kept fresh: refetches when any lock of the resource changes, or the connection comes back. */
export function useGetLocksLive<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(resource: TName, options: LockReadOptions = {}) {
  const ctx = useCheloneContext<TResources>();
  const query = useGetLocks<TResources, TName>(resource, options);
  watchEffect((onCleanup) => {
    if (!isEnabled(options.enabled)) return;
    onCleanup(subscribeLiveLocks(ctx, resource).stop);
  });
  return query;
}

export interface UseLockOnMountOptions {
  /** Defaults to the ambient resource. */
  resource?: MaybeRefOrGetter<string | undefined>;
  /** Defaults to the id of the ambient record. */
  id?: MaybeRefOrGetter<Identifier | null | undefined>;
  /** Defaults to the auth provider's identity. */
  identity?: MaybeRefOrGetter<Identifier | undefined>;
  meta?: Record<string, unknown>;
  /** Called with a failed lock or release. */
  onLockError?: (error: Error) => void;
}

const idleLockState: LockSessionState = {
  lock: null,
  isLocking: false,
  error: null,
};

/**
 * Holds a record's lock for as long as the component lives. A changing
 * resource, id or identity releases the old lock and takes the new one. With
 * no resource or id it takes nothing.
 */
export function useLockOnMount({
  resource,
  id,
  identity,
  meta,
  onLockError,
}: UseLockOnMountOptions = {}) {
  const { dataProvider, authProvider } = useCheloneContext();
  // Both contexts are read once: `useRecordContext` returns a snapshot.
  const ambientResource = useResourceContext();
  const ambientId = useRecordContext()?.id as Identifier | undefined;

  // The session changes with the id, but `useMicroStore` binds one store for
  // the component's life, so each session is mirrored into this one.
  const mirror = createMicroStore<LockSessionState>(idleLockState);
  const state = useMicroStore(mirror);

  watchEffect((onCleanup) => {
    const resolvedResource = toValue(resource) ?? ambientResource;
    const resolvedId = toValue(id) ?? ambientId;
    const resolvedIdentity = toValue(identity);
    if (resolvedResource === undefined || resolvedId == null) return;
    assertRealtimeDataProvider(dataProvider, "useLockOnMount");

    const session = createLockSession({
      dataProvider,
      resource: resolvedResource,
      id: resolvedId,
      getIdentity: () => resolveLockIdentity(authProvider, resolvedIdentity),
      meta,
      onError: onLockError,
    });
    const unsubscribe = session.store.subscribe(() =>
      mirror.setState(session.store.getSnapshot()),
    );
    void session.start();
    mirror.setState(session.store.getSnapshot());

    onCleanup(() => {
      unsubscribe();
      mirror.setState(idleLockState);
      void session.stop();
    });
  });

  return {
    lock: computed(() => state.value.lock),
    isLocking: computed(() => state.value.isLocking),
    lockError: computed(() => state.value.error),
  };
}
