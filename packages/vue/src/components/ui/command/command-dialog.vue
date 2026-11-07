<script lang="ts">
/** Props for {@link CommandDialog}. */
export interface CommandDialogProps {
  /** Whether the dialog is open. Default `false`. */
  open?: boolean;
  /** Screen-reader-only title; the panel is labelled by it. */
  title?: string;
  /** Screen-reader-only description. */
  description?: string;
  /** Extra CSS class appended to the panel. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<CommandDialog>` — a `<Command>` in a modal panel, the Vue analog of
 * shadcn's `CommandDialog`. Like `sheet.vue` it is dependency-free and renders
 * INLINE (no `<Teleport>`): a fixed backdrop and a `role="dialog"` panel,
 * closing on Escape or a backdrop click by emitting `update:open`. The default
 * slot is the command's content (input, list).
 */

import { nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import { cn } from "../../../lib/utils";
import Command from "./command.vue";

const props = withDefaults(defineProps<CommandDialogProps>(), {
  open: false,
  title: "Command Palette",
  description: "Search for a command to run...",
});

const emit = defineEmits<{ "update:open": [open: boolean] }>();

const titleId = useId();
const descriptionId = useId();
const panel = ref<HTMLElement | null>(null);

function close(): void {
  emit("update:open", false);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") close();
}

watch(
  () => props.open,
  async (open) => {
    if (typeof document === "undefined") return;
    if (open) {
      document.addEventListener("keydown", onKeydown);
      await nextTick();
      panel.value?.querySelector("input")?.focus();
    } else {
      document.removeEventListener("keydown", onKeydown);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (typeof document !== "undefined")
    document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50" data-slot="command-dialog">
    <div
      class="absolute inset-0 bg-black/50"
      data-slot="command-dialog-overlay"
      @click="close"
    />
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descriptionId"
      :class="
        cn(
          'fixed top-1/2 left-1/2 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border bg-background p-0 shadow-lg sm:max-w-lg',
          props.class,
        )
      "
      data-slot="command-dialog-content"
    >
      <h2 :id="titleId" class="sr-only">{{ title }}</h2>
      <p :id="descriptionId" class="sr-only">{{ description }}</p>
      <Command>
        <slot />
      </Command>
    </div>
  </div>
</template>
