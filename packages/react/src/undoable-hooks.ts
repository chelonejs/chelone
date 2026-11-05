import {
  startUndoableMutation,
  type TranslateParamValues,
  type UndoableHandle,
} from "@chelone/core";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useCheloneNotifications } from "./context";

/**
 * The caller-facing options for {@link useUndoable}'s `runUndoable`. The adapter
 * (a button/hook) supplies the affected query keys, the synchronous optimistic
 * cache mutation, and the DEFERRED dataProvider call; `runUndoable` snapshots +
 * applies + notifies, and returns the core {@link UndoableHandle}.
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
   * REPLACES the default commit-error handling. The default rolls the cache
   * back (done by the core handle) and notifies `chelone.notification.http_error`.
   */
  onCommitError?: (error: unknown) => void;
}

/**
 * Bridge `startUndoableMutation` to the notification store: apply the optimistic
 * change now, enqueue an UNDOABLE notification, and hand its `undo`/`onClose`
 * callbacks the core handle. The {@link Notification} component renders the Undo
 * action (⇒ `handle.undo()`, server untouched) and treats auto-hide/dismiss as
 * a COMMIT (⇒ `handle.commit()`, server exactly once). All integrity guarantees
 * (0 calls on undo, 1 on commit, rollback-on-error) live in the core handle;
 * this hook is only the notification wiring.
 *
 * Uses the OPTIONAL notification store (`useCheloneNotifications`) rather than
 * the throwing `useNotify`, so a component that merely CALLS this hook without
 * ever running an undoable mutation (e.g. `useDelete` in pessimistic mode)
 * works with no notification store. An actual undoable mutation does require
 * one — its Undo notification is what drives the commit — so `runUndoable`
 * throws if invoked without a store.
 */
export function useUndoable(): (options: RunUndoableOptions) => UndoableHandle {
  const queryClient = useQueryClient();
  const store = useCheloneNotifications();
  return useCallback(
    (options: RunUndoableOptions) => {
      if (!store) {
        throw new Error(
          "useUndoable: mutationMode='undoable' requires a notification store — pass <CheloneProvider notifications={createNotificationStore()}>.",
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
    },
    [queryClient, store],
  );
}
