import type { Notification, NotificationStore } from "@chelone/core";
import { useSyncExternalStore } from "react";
import { useChelonNotifications } from "./context";

/**
 * `useNotify` throws without a store: pushing a notification nowhere is a
 * wiring error. `useNotifications` degrades to an empty queue instead, so
 * `<Notification>` in the default layout renders nothing when none is wired.
 */
function useRequiredNotifications(caller: string): NotificationStore {
  const notifications = useChelonNotifications();
  if (!notifications) {
    throw new Error(
      `${caller}: pass a notification store to <CheloneProvider notifications={createNotificationStore()}>.`,
    );
  }
  return notifications;
}

const noSubscribe = () => () => {};
const emptyQueue: readonly Notification[] = [];
const getEmptyQueue = () => emptyQueue;

/** Reactive snapshot of the notification queue (i18n keys — translate in UI). */
export function useNotifications(): readonly Notification[] {
  const store = useChelonNotifications();
  return useSyncExternalStore(
    store ? store.subscribe : noSubscribe,
    store ? store.getSnapshot : getEmptyQueue,
    store ? store.getSnapshot : getEmptyQueue,
  );
}

/** Stable `notify` action off the shared store. */
export function useNotify(): NotificationStore["notify"] {
  return useRequiredNotifications("useNotify").notify;
}
