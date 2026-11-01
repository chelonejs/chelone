<script lang="ts">
/** Props for {@link Sheet}. */
export interface SheetProps {
  /** Whether the sheet is open. Default `false`. */
  open?: boolean;
  /** Edge the sheet slides in from. Default `"right"`. */
  side?: "top" | "right" | "bottom" | "left";
  /** Heading text; the panel is labelled by it. */
  title?: string;
  /** Text under the heading. */
  description?: string;
  /** Extra CSS class appended to the panel. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Sheet>` — the shadcn side-panel primitive, the Vue analog of
 * `@chelone/react`'s `ui/sheet.tsx` (a radix `Dialog`). Like
 * `feedback/confirm.vue` it is dependency-free and renders INLINE (no reka-ui,
 * no `<Teleport>`): a fixed backdrop and a `role="dialog"` panel pinned to one
 * edge, closing on Escape or a backdrop click by emitting `update:open`. The
 * default slot is the body, the `footer` slot sits below it.
 */

import { computed, onBeforeUnmount, useId, watch } from "vue";
import { cn } from "../../lib/utils";

const props = withDefaults(defineProps<SheetProps>(), {
  open: false,
  side: "right",
});

const emit = defineEmits<{ "update:open": [open: boolean] }>();

const titleId = useId();

const sideClass = {
  right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
  left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
  top: "inset-x-0 top-0 h-auto border-b",
  bottom: "inset-x-0 bottom-0 h-auto border-t",
} as const;

const panelClass = computed(() =>
  cn(
    "fixed z-50 flex flex-col gap-4 bg-background shadow-lg",
    sideClass[props.side],
    props.class,
  ),
);

function close(): void {
  emit("update:open", false);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") close();
}

watch(
  () => props.open,
  (open) => {
    if (typeof document === "undefined") return;
    if (open) document.addEventListener("keydown", onKeydown);
    else document.removeEventListener("keydown", onKeydown);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (typeof document !== "undefined")
    document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50" data-slot="sheet">
    <div
      class="absolute inset-0 bg-black/50"
      data-slot="sheet-overlay"
      @click="close"
    />
    <div
      role="dialog"
      aria-modal="true"
      :aria-labelledby="title ? titleId : undefined"
      :class="panelClass"
      :data-side="side"
      data-slot="sheet-content"
    >
      <div
        v-if="title || description"
        class="flex flex-col gap-1.5 p-4"
        data-slot="sheet-header"
      >
        <h2
          v-if="title"
          :id="titleId"
          class="font-semibold text-foreground"
          data-slot="sheet-title"
        >
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="text-sm text-muted-foreground"
          data-slot="sheet-description"
        >
          {{ description }}
        </p>
      </div>
      <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
        <slot />
      </div>
      <div
        v-if="$slots.footer"
        class="mt-auto flex flex-col gap-2 p-4"
        data-slot="sheet-footer"
      >
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
