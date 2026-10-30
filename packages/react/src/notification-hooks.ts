import type { Notification, NotificationStore } from "@chelone/core";
import { useSyncExternalStore } from "react";
import { useCheloneNotifications } from "./context";

/**
 * Chosen semantic: BOTH notification hooks throw without a store — consistent
 * with useCheloneStore/useCheloneI18n/useCheloneAuthProvider. Rendering or
 * pushing notifications requires wiring `notifications` on <CheloneProvider>.
 */
function useRequiredNotifications(caller: string): NotificationStore {
  const notifications = useCheloneNotifications();
  if (!notifications) {
    throw new Error(
      `${caller}: pass a notification store to <CheloneProvider notifications={createNotificationStore()}>.`,
    );
  }
  return notifications;
}

/** Reactive snapshot of the notification queue (i18n keys — translate in UI). */
export function useNotifications(): readonly Notification[] {
  const store = useRequiredNotifications("useNotifications");
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}

/** Stable `notify` action off the shared store. */
export function useNotify(): NotificationStore["notify"] {
  return useRequiredNotifications("useNotify").notify;
}
