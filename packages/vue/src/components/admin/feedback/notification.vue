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
 */

import { onBeforeUnmount, ref, watch } from "vue";
import { useChelonNotifications } from "../../../context";
import { useTranslate } from "../../../i18n/use-translate";
import { useNotifications } from "../../../notification-hooks";

const props = withDefaults(defineProps<NotificationProps>(), {
  duration: 5000,
});

const store = useChelonNotifications();
const notifications = useNotifications();
const translate = useTranslate();

const toasts = ref<LiveToast[]>([]);
const shown = new Set<number>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function dismiss(id: number): void {
  const index = toasts.value.findIndex((t) => t.id === id);
  if (index !== -1) toasts.value.splice(index, 1);
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  shown.delete(id);
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
      });
      if (props.duration > 0) {
        timers.set(
          id,
          setTimeout(() => dismiss(id), props.duration),
        );
      }
      // Drain the queue immediately — the toast now owns the lifecycle.
      store?.dismiss(id);
    }
  },
  { immediate: true, deep: true },
);

onBeforeUnmount(() => {
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
      role="status"
    >
      <span class="text-sm">{{ toast.message }}</span>
      <button
        type="button"
        class="ml-auto text-muted-foreground hover:text-foreground"
        aria-label="Close"
        data-slot="notification-close"
        @click="dismiss(toast.id)"
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
