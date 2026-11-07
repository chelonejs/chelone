<script setup lang="ts">
/**
 * `<ChartContainer>` — the chart wrapper. Sets `data-slot="chart"` and
 * `data-chart`, provides the config to the chart parts and renders the
 * `<ChartStyle>` that defines `--color-*` for it. The Vue analog of shadcn-vue's
 * `ChartContainer`.
 */

import { toRefs } from "vue";
import { cn } from "../../../lib/utils";
import ChartStyle from "./chart-style.vue";
import { type ChartConfig, provideChartContext, useId } from "./utils";

const props = defineProps<{
  id?: string;
  class?: string;
  config: ChartConfig;
}>();

const { config } = toRefs(props);
const uniqueId = useId();
const chartId = `chart-${props.id || uniqueId}`;

provideChartContext({ id: uniqueId, config });
</script>

<template>
  <div
    data-slot="chart"
    :data-chart="chartId"
    :class="
      cn(
        '[--vis-axis-grid-color:var(--border)] [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke=\'#ccc\']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke=\'#ccc\']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke=\'#ccc\']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke=\'#fff\']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke=\'#fff\']]:stroke-transparent [&_.recharts-surface]:outline-hidden',
        props.class,
      )
    "
  >
    <ChartStyle :id="chartId" :config="config" />
    <slot />
  </div>
</template>
