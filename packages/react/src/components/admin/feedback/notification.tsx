/**
 * `<Notification>` — the sonner bridge over chelone's notification store.
 * Ported from shadmin `feedback/notification.tsx`; the seam (ra-core's
 * `useNotificationContext` + undoable-mutation machinery) is rewired to
 * chelone's simpler `NotificationStore`.
 *
 * Chelone divergences (deliberate — the chelone notification model is smaller):
 * - chelone `Notification` is `{ id, message (i18n KEY), type, messageArgs }`.
 *   No undoable mutations, no `autoHideDuration`, no `beforeunload` guard, no
 *   `ExternalToast` — those are ra-core concepts chelone hasn't ported.
 * - The queue is DRAINED, not "current-one-at-a-time": each new notification is
 *   translated, fired as a sonner toast, then `dismiss()`ed from the store (the
 *   toast owns its lifecycle from then on). The store stays the source of
 *   truth for the PENDING queue only.
 * - Theme is read from chelone's `useTheme` (store-backed), passed to `<Toaster>`.
 */

import { useEffect, useRef } from "react";
import { Toaster, type ToasterProps, toast } from "sonner";
import { useChelonNotifications } from "../../../context";
import { useTranslate } from "../../../i18n-hooks";
import { useNotifications } from "../../../notification-hooks";
import { useTheme } from "../layout/use-theme";

/**
 * Displays notifications triggered with the `useNotify` hook.
 *
 * Supports the four notification types (info/success/warning/error) and adapts
 * to the active theme (light/dark). Mount it once, near the layout root.
 *
 * @example
 * // Trigger a notification
 * import { useNotify } from "@chelone/react";
 *
 * const NotifyButton = () => {
 *   const notify = useNotify();
 *   return (
 *     <button onClick={() => notify("posts.approved", { type: "success" })}>
 *       Approve
 *     </button>
 *   );
 * };
 */
function Notification(props: ToasterProps) {
  const store = useChelonNotifications();
  const notifications = useNotifications();
  const translate = useTranslate();
  const [theme] = useTheme();

  // Track which ids we've already handed to sonner so a re-render (or a locale
  // change refreshing `translate`) never double-fires a toast.
  const shownRef = useRef<Set<number>>(new Set());

  // Keep the latest translate without re-firing the drain when the locale
  // changes (parity with shadmin's translate-ref).
  const translateRef = useRef(translate);
  translateRef.current = translate;

  useEffect(() => {
    if (!store) return;
    const shown = shownRef.current;
    for (const notification of notifications) {
      if (shown.has(notification.id)) continue;
      shown.add(notification.id);

      const { id, message, type, messageArgs } = notification;
      const finalMessage = translateRef.current(message, messageArgs);

      const dismissFromStore = () => {
        shown.delete(id);
        store.dismiss(id);
      };

      toast[type](finalMessage, {
        onDismiss: dismissFromStore,
        onAutoClose: dismissFromStore,
      });
      // Drain the queue immediately — the toast now owns the lifecycle.
      store.dismiss(id);
    }
  }, [notifications, store]);

  const defaultToasterProps: Partial<ToasterProps> = {
    richColors: true,
    closeButton: true,
    position: "bottom-center",
  };

  return <Toaster {...defaultToasterProps} theme={theme} {...props} />;
}

export { Notification };
