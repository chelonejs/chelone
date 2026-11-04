<script setup lang="ts">
/**
 * `<ChartLegendContent>` — one legend entry per config key, with its icon or a
 * color swatch and its label. The Vue analog of shadcn-vue's
 * `ChartLegendContent`.
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useChart } from "./utils";

const props = withDefaults(
  defineProps<{
    class?: string;
    hideIcon?: boolean;
    verticalAlign?: "top" | "bottom";
  }>(),
  { verticalAlign: "bottom" },
);

const { config } = useChart();

const items = computed(() =>
  Object.entries(config.value).map(([key, item]) => ({
    key,
    item,
    // A themed entry has no single color; `ChartStyle` defines the variable.
    color: item.color ?? `var(--color-${key})`,
  })),
);
</script>

<template>
  <div
    v-if="items.length"
    :class="
      cn(
        'flex items-center justify-center gap-4',
        props.verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        props.class,
      )
    "
  >
    <div
      v-for="entry in items"
      :key="entry.key"
      data-slot="chart-legend-item"
      class="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
    >
      <component
        :is="entry.item.icon"
        v-if="entry.item.icon && !props.hideIcon"
      />
      <div
        v-else
        class="h-2 w-2 shrink-0 rounded-[2px]"
        :style="{ backgroundColor: entry.color }"
      />
      <component :is="entry.item.label" v-if="typeof entry.item.label !== 'string'" />
      <template v-else>{{ entry.item.label }}</template>
    </div>
  </div>
</template>
