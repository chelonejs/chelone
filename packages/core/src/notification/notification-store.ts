export interface Notification {
  id: number;
  /** An i18n message KEY — translation/rendering is the UI layer's job. */
  message: string;
  type: "info" | "success" | "warning" | "error";
  messageArgs?: Record<string, unknown>;
}

export interface NotificationStore {
  notify(
    message: string,
    options?: {
      type?: Notification["type"];
      messageArgs?: Record<string, unknown>;
    },
  ): number;
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
