<script setup lang="ts">
/**
 * `<TabsTrigger>` — a `role="tab"` button. Selection follows focus (Radix's
 * automatic activation), so the arrow keys, `Home` and `End` only move focus to
 * a sibling enabled trigger and the focus handler selects it; the focus
 * handler also runs on click where the browser focuses a button. The roving
 * `tabindex` leaves only the active tab in the page's tab order.
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useTabs } from "./context";

const props = defineProps<{
  value: string;
  disabled?: boolean;
  class?: string;
}>();

const tabs = useTabs();
const active = computed(() => tabs.value.value === props.value);

function select(): void {
  if (!props.disabled && !active.value) tabs.select(props.value);
}

function onKeydown(event: KeyboardEvent): void {
  const current = event.currentTarget;
  if (!(current instanceof HTMLElement)) return;
  const triggers = Array.from(
    current
      .closest('[role="tablist"]')
      ?.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)') ?? [],
  );
  const index = triggers.indexOf(current);
  if (index === -1) return;
  const target = {
    ArrowRight: triggers[(index + 1) % triggers.length],
    ArrowLeft: triggers[(index - 1 + triggers.length) % triggers.length],
    Home: triggers[0],
    End: triggers[triggers.length - 1],
  }[event.key];
  if (!target) return;
  event.preventDefault();
  target.focus();
}
</script>

<template>
  <button
    type="button"
    role="tab"
    data-slot="tabs-trigger"
    :id="tabs.triggerId(value)"
    :aria-selected="active"
    :aria-controls="tabs.panelId(value)"
    :data-state="active ? 'active' : 'inactive'"
    :tabindex="active ? 0 : -1"
    :disabled="disabled"
    :class="
      cn(
        'relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent',
        'data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground',
        'after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100',
        props.class,
      )
    "
    @click="select"
    @focus="select"
    @keydown="onKeydown"
  >
    <slot />
  </button>
</template>
