/**
 * Notification composables — the Vue twin of `@chelone/react`'s
 * `notification-hooks.ts` (`useNotifications` / `useNotify`). React reads the
 * store with `useSyncExternalStore`; Vue bridges the same
 * `subscribe`/`getSnapshot` seam into a `shallowRef` released on scope disposal
 * (the pattern established by `store/use-store.ts`).
 *
 * DELIBERATE DIVERGENCE: the React `useNotifications` THROWS without a store;
 * the Vue `useNotifications` DEGRADES to an empty snapshot so `<Notification>`
 * can be mounted in a shell that never configured a notification store (it then
 * simply renders nothing). `useNotify` still throws — pushing a notification
 * with no store is a wiring error, exactly as in React.
 */

import type { Notification, NotificationStore } from "@chelone/core";
import { computed, onScopeDispose, type Ref, shallowRef } from "vue";
import { useChelonNotifications } from "./context";

/**
 * Reactive snapshot of the pending notification queue (i18n keys — translate in
 * the UI). Degrades to a stable empty list when no store was provided.
 */
export function useNotifications(): Readonly<Ref<readonly Notification[]>> {
  const store = useChelonNotifications();
  if (!store) {
    return computed(() => [] as readonly Notification[]);
  }
  const snapshot = shallowRef<readonly Notification[]>(store.getSnapshot());
  const unsubscribe = store.subscribe(() => {
    snapshot.value = store.getSnapshot();
  });
  onScopeDispose(unsubscribe);
  return computed(() => snapshot.value);
}

/** Stable `notify` action off the shared store — throws when none was provided. */
export function useNotify(): NotificationStore["notify"] {
  const store = useChelonNotifications();
  if (!store) {
    throw new Error(
      "useNotify: pass a notification store to <Admin notifications={createNotificationStore()}>.",
    );
  }
  return store.notify;
}
