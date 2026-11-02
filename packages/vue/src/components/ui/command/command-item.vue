<script setup lang="ts">
/**
 * `<CommandItem>` — a selectable row. Registers with the root, hides itself
 * (it stays mounted, so it stays registered) when the filter scores it `0`
 * unless `forceMount`, and becomes active on hover. Emits `select` on click or
 * on Enter while active; a disabled item never becomes active and never selects.
 */

import { computed, inject, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { cn } from "../../../lib/utils";
import { type CommandItemEntry, CommandGroupKey, useCommand } from "./context";

const props = defineProps<{
  value: string;
  keywords?: string[];
  disabled?: boolean;
  forceMount?: boolean;
  class?: string;
}>();
const emit = defineEmits<{ select: [value: string] }>();

const ctx = useCommand();
const id = useId();
const el = ref<HTMLElement | null>(null);

const entry: CommandItemEntry = {
  id,
  groupId: inject(CommandGroupKey, null),
  el,
  props,
  select: () => {
    if (!props.disabled) emit("select", props.value);
  },
};

let unregister: (() => void) | undefined;
onMounted(() => {
  unregister = ctx.registerItem(entry);
});
onBeforeUnmount(() => unregister?.());

const visible = computed(() => ctx.isVisible(entry));
const active = computed(() => ctx.activeId.value === id);

watch(active, (isActive) => {
  if (isActive) el.value?.scrollIntoView?.({ block: "nearest" });
});

function onPointerMove(): void {
  if (!props.disabled) ctx.setActive(id);
}
</script>

<template>
  <div
    v-show="visible"
    :id="id"
    ref="el"
    role="option"
    :aria-selected="active"
    :aria-disabled="disabled || undefined"
    :data-selected="active ? 'true' : undefined"
    :data-disabled="disabled ? 'true' : undefined"
    :class="
      cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
        props.class,
      )
    "
    data-slot="command-item"
    @pointermove="onPointerMove"
    @click="entry.select()"
  >
    <slot />
  </div>
</template>
