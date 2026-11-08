/**
 * `<Notification>` — the sonner bridge over chelone's notification store.
 * Ported from shadmin `feedback/notification.tsx`; the seam (ra-core's
 * `useNotificationContext` + undoable-mutation machinery) is rewired to
 * chelone's `NotificationStore` + the vanilla `startUndoableMutation` engine.
 *
 * Chelone divergences (deliberate — the chelone notification model is smaller):
 * - chelone `Notification` is `{ id, message (i18n KEY), type, messageArgs }`
 *   plus the undoable extension `{ undoable, autoHideDuration, undo, onClose }`.
 * - The queue is DRAINED, not "current-one-at-a-time": each new notification is
 *   translated, fired as a sonner toast, then `dismiss()`ed from the store (the
 *   toast owns its lifecycle from then on). The store stays the source of
 *   truth for the PENDING queue only.
 * - UNDOABLE notifications render an Undo action → `notification.undo()` (rolls
 *   the cache back, server untouched); the auto-hide timeout or a manual
 *   dismiss → `notification.onClose()` (COMMIT — the deferred server call once).
 *   All integrity guarantees are enforced by the core undoable handle, so a
 *   stray dismiss-after-undo commit is a harmless no-op here.
 * - A `beforeunload` guard commits any still-pending undoable mutation so the
 *   server never trails the optimistic cache when the page unloads.
 * - Theme is read from chelone's `useTheme` (store-backed), passed to `<Toaster>`.
 */

import { commitAllUndoables, hasPendingUndoables } from "@chelone/core";
import { useEffect, useRef } from "react";
import { Toaster, type ToasterProps, toast } from "sonner";
import { useCheloneNotifications } from "../../../context";
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
  const store = useCheloneNotifications();
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

      if (notification.undoable) {
        // Undoable toast: the Undo action rolls the cache back (server never
        // called); the auto-hide timeout or a manual dismiss COMMITS the
        // deferred mutation. The core handle makes both callbacks idempotent
        // and one-way, so a dismiss firing after Undo is a harmless no-op.
        const toastId = toast[type](finalMessage, {
          duration: notification.autoHideDuration,
          action: {
            label: translateRef.current("chelone.action.undo", { _: "Undo" }),
            onClick: () => {
              notification.undo?.();
              toast.dismiss(toastId);
              dismissFromStore();
            },
          },
          onDismiss: () => {
            notification.onClose?.();
            dismissFromStore();
          },
          onAutoClose: () => {
            notification.onClose?.();
            dismissFromStore();
          },
        });
        store.dismiss(id);
        continue;
      }

      toast[type](finalMessage, {
        onDismiss: dismissFromStore,
        onAutoClose: dismissFromStore,
      });
      // Drain the queue immediately — the toast now owns the lifecycle.
      store.dismiss(id);
    }
  }, [notifications, store]);

  // Commit any still-pending undoable mutation when the page unloads, so the
  // server is never left behind the optimistic cache (ra-core parity).
  useEffect(() => {
    const handler = () => {
      if (hasPendingUndoables()) {
        void commitAllUndoables();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const defaultToasterProps: Partial<ToasterProps> = {
    richColors: true,
    closeButton: true,
    position: "bottom-center",
  };

  return <Toaster {...defaultToasterProps} theme={theme} {...props} />;
}

export { Notification };
