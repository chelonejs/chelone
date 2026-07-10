<script lang="ts">
/** Props for {@link DropdownMenuContent}. */
export interface DropdownMenuContentProps {
  /** Horizontal alignment against the trigger. Defaults to `start` (left). */
  align?: "start" | "end";
  /** Extra class appended to the content panel. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<DropdownMenuContent>` — the menu panel, rendered (via `v-if`) only while the
 * root is open. Positioned `absolute`ly below the trigger; `align="end"` right-
 * aligns it. The Vue analog of shadcn's `DropdownMenuContent` (no portal — see
 * `<DropdownMenu>`'s divergence note).
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useDropdownMenu } from "./context";

const props = withDefaults(defineProps<DropdownMenuContentProps>(), {
  align: "start",
});

const { open } = useDropdownMenu();

const classes = computed(() =>
  cn(
    "absolute top-full z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
    props.align === "end" ? "right-0" : "left-0",
    props.class,
  ),
);
</script>

<template>
  <div
    v-if="open"
    :class="classes"
    role="menu"
    data-slot="dropdown-menu-content"
  >
    <slot />
  </div>
</template>
