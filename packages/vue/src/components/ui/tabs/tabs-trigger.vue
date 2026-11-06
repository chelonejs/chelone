<script setup lang="ts">
/**
 * `<TabsTrigger>` — a `role="tab"` button. Selection follows focus (Radix's
 * automatic activation), so the arrow keys, `Home` and `End` only move focus to
 * a sibling enabled trigger (ArrowLeft/Right, or ArrowUp/Down in a vertical set)
 * and the focus handler selects it; the focus handler also runs on click where
 * the browser focuses a button. The roving `tabindex` leaves one trigger in the
 * page's tab order: the active one, or the first enabled when none is active.
 */

import { computed, onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import { cn } from "../../../lib/utils";
import { useTabs } from "./context";

const props = defineProps<{
  value: string;
  disabled?: boolean;
  class?: string;
}>();

const tabs = useTabs();
const active = computed(() => tabs.value.value === props.value);
const tabbable = computed(() => tabs.tabbableValue.value === props.value);
const button = useTemplateRef<HTMLButtonElement>("button");

let unregister: (() => void) | undefined;
onMounted(() => {
  const element = button.value;
  if (!element) return;
  unregister = tabs.registerTrigger({
    value: props.value,
    element,
    disabled: () => props.disabled === true,
  });
});
onBeforeUnmount(() => unregister?.());

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
  const vertical = tabs.orientation.value === "vertical";
  const next = triggers[(index + 1) % triggers.length];
  const previous = triggers[(index - 1 + triggers.length) % triggers.length];
  const target = {
    [vertical ? "ArrowDown" : "ArrowRight"]: next,
    [vertical ? "ArrowUp" : "ArrowLeft"]: previous,
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
    ref="button"
    type="button"
    role="tab"
    data-slot="tabs-trigger"
    :id="tabs.triggerId(value)"
    :aria-selected="active"
    :aria-controls="tabs.panelId(value)"
    :data-state="active ? 'active' : 'inactive'"
    :tabindex="tabbable ? 0 : -1"
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
