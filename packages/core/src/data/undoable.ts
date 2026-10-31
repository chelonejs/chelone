import type { QueryClient, QueryKey } from "@tanstack/query-core";

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
 * Module-level registry of still-undoable mutations (those neither committed
 * nor undone). Drives the adapter's `beforeunload` guard: if any remain
 * pending when the page unloads, commit them so the server is not left behind
 * the optimistic cache.
 */
const pendingUndoables = new Set<UndoableHandle<unknown>>();

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
    const later = open.slice(index + 1);
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
    },
    commit() {
      // Idempotent: a second commit returns the first call's promise.
      if (state === "committed") {
        return commitPromise as Promise<TResult | undefined>;
      }
      // Commit after undo is a no-op — the server must stay untouched.
      if (state === "undone") return Promise.resolve(undefined);
      state = "committed";
      pendingUndoables.delete(handle);
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
      return commitPromise;
    },
  };

  pendingUndoables.add(handle);
  return handle;
}

/** True while at least one undoable mutation is still awaiting commit/undo. */
export function hasPendingUndoables(): boolean {
  return pendingUndoables.size > 0;
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
