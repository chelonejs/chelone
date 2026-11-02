<script setup lang="ts">
/**
 * `<CommandInput>` — the search box, an `input` with `role="combobox"` bound to
 * the root's search text. ArrowDown/ArrowUp move the active item (wrapping),
 * Home/End jump, Enter selects. Extra attributes (`placeholder`, ...) land on
 * the `input`.
 */

import { cn } from "../../../lib/utils";
import { useCommand } from "./context";

defineOptions({ inheritAttrs: false });
const props = defineProps<{ class?: string }>();

const ctx = useCommand();

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  const moves = {
    ArrowDown: "next",
    ArrowUp: "prev",
    Home: "first",
    End: "last",
  } as const;
  if (event.key in moves) {
    event.preventDefault();
    ctx.move(moves[event.key as keyof typeof moves]);
  } else if (event.key === "Enter") {
    event.preventDefault();
    ctx.selectActive();
  }
}
</script>

<template>
  <div
    class="flex h-9 items-center gap-2 border-b px-3"
    data-slot="command-input-wrapper"
  >
    <svg
      class="size-4 shrink-0 opacity-50"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
    <input
      v-bind="$attrs"
      type="text"
      role="combobox"
      autocomplete="off"
      aria-expanded="true"
      :aria-controls="ctx.listId"
      :aria-activedescendant="ctx.activeId.value ?? undefined"
      :value="ctx.search.value"
      :class="
        cn(
          'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          props.class,
        )
      "
      data-slot="command-input"
      @input="ctx.setSearch(($event.target as HTMLInputElement).value)"
      @keydown="onKeydown"
    />
  </div>
</template>
