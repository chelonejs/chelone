<script setup lang="ts">
/**
 * `<TabsList>` — the `role="tablist"` row of triggers. `variant` is React's
 * `tabsListVariants`: `default` is the filled pill, `line` the underlined bar.
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useTabs } from "./context";

const props = withDefaults(
  defineProps<{ variant?: "default" | "line"; class?: string }>(),
  { variant: "default" },
);

const { orientation } = useTabs();

const classes = computed(() =>
  cn(
    "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
    props.variant === "line" ? "gap-1 bg-transparent" : "bg-muted",
    props.class,
  ),
);
</script>

<template>
  <div
    role="tablist"
    data-slot="tabs-list"
    :aria-orientation="orientation"
    :data-variant="variant"
    :class="classes"
  >
    <slot />
  </div>
</template>
