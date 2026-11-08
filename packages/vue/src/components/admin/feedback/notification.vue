<script lang="ts">
import type { Notification as CheloneNotification } from "@chelone/core";

/** Props for {@link Notification}. */
export interface NotificationProps {
  /** Auto-dismiss delay (ms) per toast. Default `5000`. `0` disables it. */
  duration?: number;
}

/** A live toast: a translated notification plus its own dismiss timer handle. */
interface LiveToast {
  id: number;
  message: string;
  type: CheloneNotification["type"];
  /** True for optimistic-with-Undo toasts — renders an Undo action. */
  undoable?: boolean;
  /** Rollback callback (Undo action) — leaves the server untouched. */
  undo?: () => void;
  /** Commit callback (auto-hide / close X) — fires the deferred server call. */
  onClose?: () => void;
}
</script>

<script setup lang="ts">
/**
 * `<Notification>` — surfaces `notify(...)` / notification-store messages as
 * toasts. The Vue twin of `@chelone/react`'s `feedback/notification.tsx`.
 *
 * DELIBERATE DIVERGENCE: the React twin bridges to `sonner`; `@chelone/vue`
 * carries NO toast dependency (`vue-sonner` is not installed and the package's
 * `ui/` slice is hand-rolled + dependency-free), so this ships a MINIMAL
 * dependency-free toaster: a fixed bottom-center stack whose entries adapt to the
 * theme via CSS tokens (so no explicit `theme` wiring is needed, unlike sonner's
 * `<Toaster theme>` prop).
 *
 * Queue semantics mirror the React twin: each new notification is translated,
 * pushed as a self-managed toast, then DRAINED from the store (`dismiss`) — the
 * store stays the source of truth for the PENDING queue only; the toast owns its
 * lifecycle (auto-close timer + a manual close button) from then on. A `shown`
 * set guards against a re-render (or a locale change) double-firing a toast.
 *
 * R3 (undoable): a notification flagged `undoable` renders an extra Undo action.
 * Clicking Undo runs its `undo()` callback (rolls the optimistic cache back — the
 * server is NEVER called). The auto-hide timeout OR the manual close (X) instead
 * runs `onClose()` (COMMIT — the deferred server call fires exactly once). The
 * core undoable handle makes both callbacks idempotent + one-way, so a stray
 * close firing after Undo is a harmless no-op. A `beforeunload` guard commits any
 * still-pending undoable mutation so the server never trails the optimistic cache
 * when the page unloads (ra-core parity).
 */

import { commitAllUndoables, hasPendingUndoables } from "@chelone/core";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useCheloneNotifications } from "../../../context";
import { useTranslate } from "../../../i18n/use-translate";
import { useNotifications } from "../../../notification-hooks";

const props = withDefaults(defineProps<NotificationProps>(), {
  duration: 5000,
});

const store = useCheloneNotifications();
const notifications = useNotifications();
const translate = useTranslate();

const toasts = ref<LiveToast[]>([]);
const shown = new Set<number>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

/** Remove a toast + clear its timer, WITHOUT firing any undoable callback. */
function remove(id: number): void {
  const index = toasts.value.findIndex((t) => t.id === id);
  if (index !== -1) toasts.value.splice(index, 1);
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  shown.delete(id);
}

/** Auto-hide / manual close X: COMMIT an undoable, then remove the toast. */
function close(id: number): void {
  const toast = toasts.value.find((t) => t.id === id);
  toast?.onClose?.();
  remove(id);
}

/** Undo action: ROLL BACK an undoable (server untouched), then remove. */
function undo(id: number): void {
  const toast = toasts.value.find((t) => t.id === id);
  toast?.undo?.();
  remove(id);
}

const typeClasses: Record<CheloneNotification["type"], string> = {
  info: "bg-background text-foreground border-border",
  success: "bg-background text-foreground border-green-500",
  warning: "bg-background text-foreground border-amber-500",
  error: "bg-background text-destructive border-destructive",
};

watch(
  notifications,
  (queue) => {
    for (const notification of queue) {
      if (shown.has(notification.id)) continue;
      shown.add(notification.id);
      const { id, message, type, messageArgs } = notification;
      toasts.value.push({
        id,
        message: translate(message, messageArgs),
        type,
        undoable: notification.undoable,
        undo: notification.undo,
        onClose: notification.onClose,
      });
      // Undoable toasts honor their own auto-hide window (⇒ commit on expiry).
      const duration = notification.undoable
        ? (notification.autoHideDuration ?? props.duration)
        : props.duration;
      if (duration > 0) {
        timers.set(
          id,
          setTimeout(() => close(id), duration),
        );
      }
      // Drain the queue immediately — the toast now owns the lifecycle.
      store?.dismiss(id);
    }
  },
  { immediate: true, deep: true },
);

// Commit any still-pending undoable mutation when the page unloads, so the
// server is never left behind the optimistic cache (ra-core parity).
function onBeforeUnloadHandler(): void {
  if (hasPendingUndoables()) {
    void commitAllUndoables();
  }
}

onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", onBeforeUnloadHandler);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("beforeunload", onBeforeUnloadHandler);
  }
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
});
</script>

<template>
  <div
    class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2"
    data-slot="notification"
    role="region"
    aria-live="polite"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="flex items-center gap-3 rounded-md border px-4 py-3 shadow-lg"
      :class="typeClasses[toast.type]"
      data-slot="notification-toast"
      :data-type="toast.type"
      :data-undoable="toast.undoable ? 'true' : undefined"
      role="status"
    >
      <span class="text-sm">{{ toast.message }}</span>
      <button
        v-if="toast.undoable"
        type="button"
        class="ml-auto text-sm font-medium underline underline-offset-2 hover:no-underline"
        data-slot="notification-undo"
        @click="undo(toast.id)"
      >
        {{ translate("chelone.action.undo", { _: "Undo" }) }}
      </button>
      <button
        type="button"
        :class="[
          'text-muted-foreground hover:text-foreground',
          toast.undoable ? '' : 'ml-auto',
        ]"
        aria-label="Close"
        data-slot="notification-close"
        @click="close(toast.id)"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>
