/**
 * `useUndoable` — the Vue twin of `@chelone/react`'s `undoable-hooks.ts`. Bridges
 * core's vanilla `startUndoableMutation` engine to the notification store: apply
 * the optimistic cache change NOW, enqueue an UNDOABLE notification, and hand its
 * `undo`/`onClose` callbacks the core handle. The `<Notification>` SFC renders the
 * Undo action (⇒ `handle.undo()`, server untouched) and treats the auto-hide
 * timeout / dismiss as a COMMIT (⇒ `handle.commit()`, server exactly once). Every
 * data-integrity guarantee (0 calls on undo, 1 on commit, rollback-on-error) lives
 * in the core handle — this composable is only the notification wiring.
 *
 * Idiom translation from the React twin: React reads the query client with
 * `useQueryClient()` and the store with `useCheloneNotifications()`; Vue reads both
 * off the ambient `<Admin>` context (`ctx.queryClient` + `ctx.notifications`) so
 * the returned `runUndoable` closure captures the SAME `dataProvider` /
 * `queryClient` the rest of the adapter uses. The composable never throws at call
 * time (so a button that merely CALLS it in pessimistic mode works with no store);
 * `runUndoable` itself throws if actually invoked without a notification store —
 * an undoable mutation needs its Undo notification to drive the commit.
 */

import {
  startUndoableMutation,
  type TranslateParamValues,
  type UndoableHandle,
} from "@chelone/core";
import type { QueryKey } from "@tanstack/vue-query";
import { useCheloneContext } from "../context";

/**
 * The caller-facing options for {@link useUndoable}'s `runUndoable`. A button /
 * composable supplies the affected query keys, the synchronous optimistic cache
 * mutation, and the DEFERRED dataProvider call; `runUndoable` snapshots + applies
 * + notifies, and returns the core {@link UndoableHandle}.
 */
export interface RunUndoableOptions {
  /**
   * Query keys snapshotted (before apply) and refetch-cancelled. Pass the
   * resource root (`[[resource]]`) to cover every list/one/many variant.
   */
  queryKeys: QueryKey[];
  /** Synchronous optimistic cache mutation (e.g. `removeRecordsFromCache`). */
  applyOptimistic: () => void;
  /** The DEFERRED dataProvider call — invoked once at commit, never on undo. */
  commit: () => Promise<unknown>;
  /** i18n KEY for the undoable notification (e.g. `chelone.notification.deleted`). */
  message: string;
  messageArgs?: TranslateParamValues;
  type?: "info" | "success" | "warning" | "error";
  /** Undo window in ms (default 5000). Auto-hide/dismiss ⇒ commit. */
  autoHideDuration?: number;
  /**
   * REPLACES the default commit-error handling. The default rolls the cache back
   * (done by the core handle) and notifies `chelone.notification.http_error`.
   */
  onCommitError?: (error: unknown) => void;
}

/**
 * Returns `runUndoable(options)`: start an undoable mutation (snapshot + apply +
 * deferred commit via the core engine) and enqueue its Undo notification. Read
 * the ambient `queryClient` + notification store once at setup; the returned
 * closure is safe to call from an event handler.
 */
export function useUndoable(): (options: RunUndoableOptions) => UndoableHandle {
  const { queryClient, notifications: store } = useCheloneContext();
  return (options: RunUndoableOptions) => {
    if (!store) {
      throw new Error(
        "useUndoable: mutationMode='undoable' requires a notification store — pass <Admin :notifications=\"createNotificationStore()\">.",
      );
    }
    const handle = startUndoableMutation({
      queryClient,
      queryKeys: options.queryKeys,
      applyOptimistic: options.applyOptimistic,
      commit: options.commit,
    });
    store.notify(options.message, {
      type: options.type ?? "info",
      messageArgs: options.messageArgs,
      undoable: true,
      autoHideDuration: options.autoHideDuration ?? 5000,
      undo: () => handle.undo(),
      onClose: () => {
        void handle.commit().catch((error: unknown) => {
          if (options.onCommitError) {
            options.onCommitError(error);
          } else {
            store.notify("chelone.notification.http_error", {
              type: "error",
              messageArgs: { _: String(error) },
            });
          }
        });
      },
    });
    return handle;
  };
}
