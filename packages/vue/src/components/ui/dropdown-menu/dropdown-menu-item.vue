<script setup lang="ts">
/**
 * `<DropdownMenuItem>` — a selectable menu row. Closes the menu on click, then
 * emits `select` so the consumer runs its action (the Vue idiom for the React
 * twin's `onClick`). The Vue analog of shadcn's `DropdownMenuItem`.
 */

import { cn } from "../../../lib/utils";
import { useDropdownMenu } from "./context";

const props = defineProps<{ class?: string }>();
const emit = defineEmits<{ select: [] }>();

const { setOpen } = useDropdownMenu();

function onClick(): void {
  setOpen(false);
  emit("select");
}
</script>

<template>
  <div
    role="menuitem"
    tabindex="0"
    :class="
      cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0',
        props.class,
      )
    "
    data-slot="dropdown-menu-item"
    @click="onClick"
  >
    <slot />
  </div>
</template>
