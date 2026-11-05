import type { TranslateParamValues } from "../i18n/messages";

export interface Notification {
  id: number;
  /** An i18n message KEY — translation/rendering is the UI layer's job. */
  message: string;
  type: "info" | "success" | "warning" | "error";
  messageArgs?: TranslateParamValues;
  /**
   * True for optimistic-with-Undo notifications: the adapter renders an Undo
   * action and treats auto-hide/dismiss as a COMMIT (via `onClose`).
   */
  undoable?: boolean;
  /**
   * Auto-dismiss after this many ms. When it elapses (or the user dismisses),
   * the adapter should COMMIT the undoable mutation via `onClose`. `undefined`
   * = sticky (no auto-hide).
   */
  autoHideDuration?: number;
  /**
   * Undo action for an undoable notification — rolls the cache back and leaves
   * the server untouched. The adapter wires it to the Undo button.
   */
  undo?: () => void;
  /**
   * Called when the notification closes WITHOUT an undo (auto-hide timeout or
   * manual dismiss) — the adapter uses it to COMMIT the deferred mutation.
   */
  onClose?: () => void;
}

/** The caller-facing options for `notify` (id and derived fields excluded). */
export interface NotifyOptions {
  type?: Notification["type"];
  messageArgs?: TranslateParamValues;
  undoable?: boolean;
  autoHideDuration?: number;
  undo?: () => void;
  onClose?: () => void;
}

export interface NotificationStore {
  notify(message: string, options?: NotifyOptions): number;
  dismiss(id: number): void;
  clear(): void;
  getSnapshot(): readonly Notification[];
  subscribe(callback: () => void): () => void;
}

export function createNotificationStore(): NotificationStore {
  let notifications: readonly Notification[] = [];
  let nextId = 1;
  const subscribers = new Set<() => void>();
  const emit = () => {
    for (const cb of subscribers) cb();
  };

  return {
    notify(message, options = {}) {
      const id = nextId++;
      notifications = [
        ...notifications,
        {
          id,
          message,
          type: options.type ?? "info",
          messageArgs: options.messageArgs,
          undoable: options.undoable,
          autoHideDuration: options.autoHideDuration,
          undo: options.undo,
          onClose: options.onClose,
        },
      ];
      emit();
      return id;
    },
    dismiss(id) {
      const next = notifications.filter((n) => n.id !== id);
      if (next.length === notifications.length) return;
      notifications = next;
      emit();
    },
    clear() {
      if (notifications.length === 0) return;
      notifications = [];
      emit();
    },
    getSnapshot: () => notifications,
    subscribe(callback) {
      subscribers.add(callback);
      return () => void subscribers.delete(callback);
    },
  };
}
