import {
  partialMatchKey,
  type QueryClient,
  type QueryKey,
} from "@tanstack/query-core";
import type { Identifier } from "../resource/identifier";
import type { LooseRecord, ResourceRecord } from "../resource/record";
import type { ResourceNameArg, ResourceRecordArg } from "../resource/register";
import type { RecordOf, ResourceMap } from "../resource/registry";
import { removeRecordsFromCache, updateRecordsInCache } from "./cache-ops";
import type { DataContext } from "./query-options";
import type {
  DeleteParams,
  DeleteResult,
  UpdateManyParams,
  UpdateParams,
  UpdateResult,
} from "./types";

/**
 * A snapshot of the query cache taken BEFORE an optimistic apply: an array of
 * `[query key, data-at-that-key]` tuples. Rolling back writes each value back.
 *
 * Mirrors ra-core's `Snapshot` — captured via `getQueriesData` so a single
 * requested key partial-matches every list/one/many variant under it.
 */
export type UndoableSnapshot = Array<[QueryKey, unknown]>;

export interface UndoableMutationConfig<TResult = unknown> {
  queryClient: QueryClient;
  /**
   * The query keys whose cache is snapshotted (before) and whose outgoing
   * refetches are cancelled. Partial-matched via `getQueriesData`, so passing
   * a resource root also snapshots its list/one/many entries.
   */
  queryKeys: QueryKey[];
  /**
   * Mutates the cache optimistically (e.g. remove a oneKey, patch a list).
   * Runs synchronously, immediately, after the snapshot is taken.
   */
  applyOptimistic: () => void;
  /**
   * The DEFERRED server call (the dataProvider mutation). Withheld until
   * `commit()` and then invoked EXACTLY once. Never called if the user undoes.
   */
  commit: () => Promise<TResult>;
}

type UndoableState = "pending" | "committed" | "undone";

/**
 * Handle over a single in-flight undoable mutation. The adapter's Notification
 * wires `undo()` to the Undo action and `commit()` to the auto-hide timeout /
 * dismiss. All transitions are idempotent and one-way, which is what upholds
 * the data-integrity invariants:
 *
 * - `undo()`   → rollback the cache, NEVER call the server (server: 0 calls).
 * - `commit()` → call the server EXACTLY once (double-commit is a no-op that
 *                returns the same promise; commit-after-undo is a no-op).
 * - on commit error → rollback the optimistic cache and re-throw so the adapter
 *                     can surface an error notification.
 */
export interface UndoableHandle<TResult = unknown> {
  /** Rollback the cache to the pre-mutation snapshot; resolve WITHOUT committing. */
  undo(): void;
  /**
   * Run the deferred server call ONCE. Idempotent: repeated calls return the
   * first call's promise; a call after `undo()` is a no-op resolving to
   * `undefined`. On server error, the cache is rolled back and the error
   * re-thrown.
   */
  commit(): Promise<TResult | undefined>;
  /** True until `undo()` or `commit()` has been invoked. */
  readonly isPending: boolean;
}

/**
 * The undoable state: the only core module-scope state shared across clients
 * (every other module-scope map in core is a constant or a `WeakMap` keyed by
 * `QueryClient`). All three are page-global.
 *
 * - `pendingUndoables`: the mutations neither committed nor undone. Written by
 *   an undoable mutation's start, commit and undo, and by nothing else. Drives
 *   the adapter's `beforeunload` guard: if any remain pending when the page
 *   unloads, commit them so the server is not left behind the optimistic cache.
 * - `settledListeners`: the listeners waiting for the last pending mutation to
 *   settle — the page's live-update hold.
 * - `inFlightCommits`: committed undoables whose deferred server call has not
 *   settled yet.
 *
 * Server code never reaches them: a server read path calls the query option
 * factories, and never `undoableUpdateOptions` or `undoableDeleteOptions`, the
 * two an adapter calls to start an undoable. Their readers — the `beforeunload`
 * guard and the live-update hold — are per page by design, and a server never
 * starts an undoable.
 */
const pendingUndoables = new Set<UndoableHandle<unknown>>();
const settledListeners = new Set<() => void>();
let inFlightCommits = 0;

/** Calls the listeners once no undoable is pending: after an undo, or after a commit's server call settles. */
function notifySettled() {
  if (hasUnsettledUndoables()) return;
  for (const listener of [...settledListeners]) listener();
}

/** One undoable's place in its client's start order. */
interface OpenUndoable {
  queryKeys: QueryKey[];
  applyOptimistic: () => void;
  /** Taken before this entry's optimistic apply; retaken whenever an earlier rollback re-applies it. */
  snapshot: UndoableSnapshot;
  /** The commit resolved: the entry only stays so an earlier rollback can re-apply it. */
  committed: boolean;
}

/**
 * Per client, the undoables in start order that are pending, mid-commit, or
 * committed behind an earlier one that has not settled. Handles snapshot the
 * whole resource, so a rollback must replay the later ones over its own
 * restore instead of overwriting their changes.
 */
const openUndoables = new WeakMap<QueryClient, OpenUndoable[]>();

function takeSnapshot(
  queryClient: QueryClient,
  queryKeys: QueryKey[],
): UndoableSnapshot {
  // Partial-match each key (like ra-core's getQueriesData) so nested variants are covered.
  return queryKeys.reduce<UndoableSnapshot>(
    (acc, queryKey) => acc.concat(queryClient.getQueriesData({ queryKey })),
    [],
  );
}

function restore(queryClient: QueryClient, snapshot: UndoableSnapshot) {
  for (const [key, value] of snapshot) {
    queryClient.setQueryData(key, value);
  }
}

/** Query-key partial matching is one-way, so overlap is a prefix match either way round. */
function keysOverlap(a: QueryKey[], b: QueryKey[]): boolean {
  return a.some((x) =>
    b.some((y) => partialMatchKey(x, y) || partialMatchKey(y, x)),
  );
}

/**
 * The later entries a rollback of `entry` must unwind and replay: those whose
 * keys overlap `entry`'s, or those of an earlier included entry. Others never
 * saw its change, and restoring their snapshot would revert unrelated cache.
 */
function entriesToReplay(
  later: OpenUndoable[],
  entry: OpenUndoable,
): OpenUndoable[] {
  const affectedKeys = [...entry.queryKeys];
  const affected: OpenUndoable[] = [];
  for (const other of later) {
    if (!keysOverlap(affectedKeys, other.queryKeys)) continue;
    affected.push(other);
    affectedKeys.push(...other.queryKeys);
  }
  return affected;
}

/** Drops committed entries from the front: nothing earlier can roll back over them any more. */
function dropSettledPrefix(order: OpenUndoable[]) {
  while (order[0]?.committed) order.shift();
}

/**
 * Start an undoable mutation: snapshot the affected cache, cancel outgoing
 * refetches, apply the optimistic change, and return a handle whose `undo()` /
 * `commit()` settle it. React/Vue-free — pure query-core.
 */
export function startUndoableMutation<TResult = unknown>(
  config: UndoableMutationConfig<TResult>,
): UndoableHandle<TResult> {
  const { queryClient, queryKeys, applyOptimistic, commit } = config;

  // 1. Snapshot the affected cache BEFORE the optimistic apply.
  const entry: OpenUndoable = {
    queryKeys,
    applyOptimistic,
    snapshot: takeSnapshot(queryClient, queryKeys),
    committed: false,
  };

  // 2. Cancel any outgoing refetches so they can't clobber the optimistic
  //    state. Fire-and-forget — the cancellation is requested synchronously,
  //    which lets the optimistic apply below stay immediate (the handle is
  //    returned synchronously so the adapter can wire the notification at once).
  for (const queryKey of queryKeys) {
    void queryClient.cancelQueries({ queryKey });
  }

  // 3. Apply the optimistic mutation to the cache immediately.
  applyOptimistic();

  let order = openUndoables.get(queryClient);
  if (!order) {
    order = [];
    openUndoables.set(queryClient, order);
  }
  order.push(entry);

  let state: UndoableState = "pending";
  let commitPromise: Promise<TResult | undefined> | undefined;

  const rollback = () => {
    const open = order;
    const index = open.indexOf(entry);
    const later = entriesToReplay(open.slice(index + 1), entry);
    open.splice(index, 1);
    // Unwind newest first down to this entry's pre-apply state, then replay
    // the later ones so their changes survive.
    for (const other of [...later].reverse())
      restore(queryClient, other.snapshot);
    restore(queryClient, entry.snapshot);
    for (const other of later) {
      other.snapshot = takeSnapshot(queryClient, other.queryKeys);
      other.applyOptimistic();
    }
    dropSettledPrefix(open);
  };

  const handle: UndoableHandle<TResult> = {
    get isPending() {
      return state === "pending";
    },
    undo() {
      if (state !== "pending") return;
      state = "undone";
      pendingUndoables.delete(handle);
      rollback();
      notifySettled();
    },
    commit() {
      // Idempotent: a second commit returns the first call's promise.
      if (commitPromise) return commitPromise;
      // Commit after undo is a no-op — the server must stay untouched. So is
      // one after a commit whose deferred call threw before returning a promise.
      if (state !== "pending") return Promise.resolve(undefined);
      state = "committed";
      pendingUndoables.delete(handle);
      inFlightCommits += 1;
      commitPromise = commit().then(
        (result) => {
          entry.committed = true;
          dropSettledPrefix(order);
          return result;
        },
        (error: unknown) => {
          // Server rejected the committed mutation — roll the cache back to the
          // snapshot and re-throw so the adapter can notify the error.
          rollback();
          throw error;
        },
      );
      // A separate branch, so the caller still sees the rejection.
      const settle = () => {
        inFlightCommits -= 1;
        notifySettled();
      };
      commitPromise.then(settle, settle);
      return commitPromise;
    },
  };

  pendingUndoables.add(handle);
  return handle;
}

/**
 * The callbacks an undoable `mutate` takes as its second argument. They are
 * not TanStack Query's: the server call is deferred, so `onSuccess` fires with
 * the optimistic result and `onError`/`onSettled` follow the deferred commit.
 */
export interface UndoableCallbacks<TData, TParams> {
  /** Runs right after the optimistic cache change, not after the undo window. */
  onSuccess?: (data: TData, params: TParams) => void;
  /** Runs when the deferred commit fails, after the rollback and error notification. */
  onError?: (error: unknown, params: TParams) => void;
  /** Runs once the commit ends, whether it succeeded or failed. Never after an Undo. */
  onSettled?: (params: TParams) => void;
}

/** What an undoable `useUpdate` hands `onSuccess`: the patched record. */
export type UndoableUpdateCallbacks<TRecord extends ResourceRecord> =
  UndoableCallbacks<TRecord, UpdateParams<TRecord>>;
/** What an undoable `useDelete` hands `onSuccess`: the previous record, when given. */
export type UndoableDeleteCallbacks<TRecord extends ResourceRecord> =
  UndoableCallbacks<TRecord | undefined, DeleteParams<TRecord>>;
/** What an undoable `useUpdateMany` hands `onSuccess`: the ids. */
export type UndoableUpdateManyCallbacks<TRecord extends ResourceRecord> =
  UndoableCallbacks<Identifier[], UpdateManyParams<TRecord>>;

/** Runs `run` after the current microtasks; a throw is logged, not raised. */
function later(run: () => void) {
  setTimeout(() => {
    try {
      run();
    } catch (error) {
      console.error(error);
    }
  }, 0);
}

/** The calls an undoable `mutate` makes for its callbacks; see {@link undoableCallbacks}. */
export interface UndoableSettler<TData> {
  /** Wraps the deferred `commit` so `onError` and `onSettled` run when it ends. */
  commit<TResult>(commit: () => Promise<TResult>): () => Promise<TResult>;
  /** Runs `onSuccess`: call it once the optimistic change is applied. */
  success(data: TData): void;
}

/**
 * Bind an undoable `mutate`'s callbacks to its `params`. The wrapped commit
 * rethrows a failure, so the handle still rolls back and the adapter still
 * notifies; the callbacks wait a macrotask to run after both.
 */
export function undoableCallbacks<TData, TParams>(
  params: TParams,
  callbacks: UndoableCallbacks<TData, TParams> = {},
): UndoableSettler<TData> {
  const { onSuccess, onError, onSettled } = callbacks;
  return {
    success: (data) => onSuccess?.(data, params),
    // The callbacks run in a timer, never inside the commit's promise: one that
    // throws must not read as a failed commit and roll the cache back.
    commit: (commit) => async () => {
      let result: Awaited<ReturnType<typeof commit>>;
      try {
        result = await commit();
      } catch (error) {
        later(() => {
          onError?.(error, params);
          onSettled?.(params);
        });
        throw error;
      }
      later(() => onSettled?.(params));
      return result;
    },
  };
}

/** What an adapter's `runUndoable` needs besides the deferred `commit`. */
export interface UndoableCacheOptions {
  queryKeys: QueryKey[];
  applyOptimistic: () => void;
  message: string;
  messageArgs: { smart_count: number };
}

/** Patch `ids` in the `resource` caches now; the notification reads "updated". */
export function undoableUpdateOptions<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  queryClient: QueryClient,
  resource: TName,
  ids: Identifier[],
  data: Partial<RecordOf<TResources, TName>>,
): UndoableCacheOptions {
  return {
    queryKeys: [[resource]],
    applyOptimistic: () =>
      updateRecordsInCache<TResources, TName>(queryClient, resource, ids, data),
    message: "chelone.notification.updated",
    messageArgs: { smart_count: ids.length },
  };
}

/** Remove `ids` from the `resource` caches now; the notification reads "deleted". */
export function undoableDeleteOptions(
  queryClient: QueryClient,
  resource: string,
  ids: Identifier[],
): UndoableCacheOptions {
  return {
    queryKeys: [[resource]],
    applyOptimistic: () => removeRecordsFromCache(queryClient, resource, ids),
    message: "chelone.notification.deleted",
    messageArgs: { smart_count: ids.length },
  };
}

/**
 * The `mutate` / `mutateAsync` pair an undoable mutation swaps into its
 * mutation object. `mutate` is fire-and-forget and `mutateAsync` resolves once
 * the undoable is enqueued, not on the deferred server response — the same
 * shape in both adapters, so both take it from here.
 */
export interface UndoableMutators<TData, TParams> {
  mutate: (
    params: TParams,
    callbacks?: UndoableCallbacks<TData, TParams>,
  ) => void;
  mutateAsync: (params: TParams) => Promise<void>;
}

/**
 * What an undoable mutator hands the adapter's `runUndoable`: the cache options
 * plus the deferred provider call. Each adapter's own runner takes a wider
 * `commit`, so it drops in here.
 */
type UndoableRunner<TResult> = (
  options: UndoableCacheOptions & { commit: () => Promise<TResult> },
) => void;

/**
 * The pair an undoable `useUpdate` swaps in: patch the caches now, defer the
 * provider call to the commit, and bind `mutate`'s callbacks to its params.
 *
 * The deferred call runs on a loose {@link DataContext}: the name the hook was
 * handed may be a `string` its own map cannot pin.
 */
export function undoableUpdateMutators<
  TResources extends ResourceMap,
  TName extends string,
>(
  ctx: DataContext<TResources>,
  resource: ResourceNameArg<TResources, TName>,
  run: UndoableRunner<UpdateResult<LooseRecord>>,
): UndoableMutators<
  ResourceRecordArg<TResources, TName>,
  UpdateParams<ResourceRecordArg<TResources, TName>>
> {
  const mutate = (
    params: UpdateParams<ResourceRecordArg<TResources, TName>>,
    callbacks?: UndoableUpdateCallbacks<ResourceRecordArg<TResources, TName>>,
  ) => {
    const settle = undoableCallbacks(params, callbacks);
    const dataContext: DataContext = ctx;
    run({
      ...undoableUpdateOptions(
        ctx.queryClient,
        resource,
        [params.id],
        params.data,
      ),
      commit: settle.commit(() =>
        dataContext.dataProvider.update(resource, params),
      ),
    });
    settle.success(patchedRecord(params));
  };
  return {
    mutate,
    mutateAsync: async (params) => {
      mutate(params);
    },
  };
}

/** The pair an undoable `useDelete` swaps in: remove the row now, defer the provider call to the commit. */
export function undoableDeleteMutators<
  TResources extends ResourceMap,
  TName extends string,
>(
  ctx: DataContext<TResources>,
  resource: ResourceNameArg<TResources, TName>,
  run: UndoableRunner<DeleteResult<LooseRecord>>,
): UndoableMutators<
  ResourceRecordArg<TResources, TName> | undefined,
  DeleteParams<ResourceRecordArg<TResources, TName>>
> {
  const mutate = (
    params: DeleteParams<ResourceRecordArg<TResources, TName>>,
    callbacks?: UndoableDeleteCallbacks<ResourceRecordArg<TResources, TName>>,
  ) => {
    const settle = undoableCallbacks(params, callbacks);
    const dataContext: DataContext = ctx;
    run({
      ...undoableDeleteOptions(ctx.queryClient, resource, [params.id]),
      commit: settle.commit(() =>
        dataContext.dataProvider.delete(resource, params),
      ),
    });
    settle.success(params.previousData);
  };
  return {
    mutate,
    mutateAsync: async (params) => {
      mutate(params);
    },
  };
}

/** The record an undoable update shows at once: the previous one with the patch on top. */
export function patchedRecord<TRecord extends ResourceRecord>(
  params: UpdateParams<TRecord>,
): TRecord {
  return { ...params.previousData, ...params.data, id: params.id } as TRecord;
}

/** True while at least one undoable mutation is still awaiting commit/undo. */
export function hasPendingUndoables(): boolean {
  return pendingUndoables.size > 0;
}

/** True while an undoable is pending or its committed server call is still in flight. */
export function hasUnsettledUndoables(): boolean {
  return pendingUndoables.size > 0 || inFlightCommits > 0;
}

/** Runs `listener` each time the last pending undoable mutation settles. */
export function onUndoablesSettled(listener: () => void): () => void {
  settledListeners.add(listener);
  return () => {
    settledListeners.delete(listener);
  };
}

/**
 * Commit every still-pending undoable mutation (the `beforeunload` guard).
 * Never rejects — individual commit failures are swallowed here (each already
 * rolled its own cache back); it only guarantees the server calls are fired.
 */
export async function commitAllUndoables(): Promise<void> {
  const handles = [...pendingUndoables];
  await Promise.allSettled(handles.map((handle) => handle.commit()));
}
