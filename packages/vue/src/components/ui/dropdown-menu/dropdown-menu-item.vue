<script setup lang="ts">
/**
 * `<DropdownMenuItem>` — a selectable menu row. Closes the menu on click or on
 * Enter / Space, then emits `select` so the consumer runs its action (the Vue
 * idiom for the React twin's `onClick`). The Vue analog of shadcn's
 * `DropdownMenuItem`.
 *
 * The row is a `div` with `role="menuitem"` and `tabindex="0"`, which gets no
 * key activation from the browser, so Enter and Space are handled here — the
 * keyboard path radix gives the React twin for free.
 */

import { cn } from "../../../lib/utils";
import { useDropdownMenu } from "./context";

const props = defineProps<{ class?: string }>();
const emit = defineEmits<{ select: [] }>();

const { setOpen } = useDropdownMenu();

function select(): void {
  setOpen(false);
  emit("select");
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" && event.key !== " ") return;
  // Space would otherwise scroll the page behind the menu.
  event.preventDefault();
  select();
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
    @click="select"
    @keydown="onKeydown"
  >
    <slot />
  </div>
</template>
