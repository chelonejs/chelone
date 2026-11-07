<script lang="ts">
import type { LooseRecord } from "@chelone/core";
import type { SeriesChartProps } from "./series-chart";

export interface BarChartProps<
  TRow extends object = LooseRecord,
  TX extends keyof TRow & string = keyof TRow & string,
> extends SeriesChartProps<TRow, TX> {
  /** Any CSS color. Left out, each bar draws in the next theme chart color. */
  color?: string;
  /** Any CSS colors, cycled over the bars when `color` is left out. Defaults to the theme's chart colors. */
  colors?: readonly string[];
}
</script>

<script setup lang="ts" generic="TRow extends object = LooseRecord, TX extends keyof TRow & string = keyof TRow & string">
/**
 * `<BarChart>` — one bar per row over one numeric field, the Vue twin of
 * `@chelone/react`'s `charts/bar-chart.tsx`, drawn with unovis. x is the row
 * index, so any x value keeps its order; the x axis maps each tick back to the
 * row's own `x`. Needs the optional `@unovis/vue` and `@unovis/ts` peers.
 *
 * @example
 * import { BarChart } from "@chelone/vue/charts";
 *
 * <BarChart :data="visits" x-field="day" y-field="count" title="Visits" />
 */

import {
  chartColor,
  DEFAULT_CHART_COLORS,
  hasChartValues,
} from "@chelone/core";
import {
  VisAxis,
  VisCrosshair,
  VisGroupedBar,
  VisTooltip,
  VisXYContainer,
} from "@unovis/vue";
import { ChartContainer } from "../ui/chart";
import ChartFrame from "./chart-frame.vue";
import { rowX, useSeriesRows, rowY } from "./series-chart";

const props = withDefaults(defineProps<BarChartProps<TRow, TX>>(), {
  colors: () => DEFAULT_CHART_COLORS,
  height: 200,
  loading: false,
  bare: false,
});

const { rows, config, xAxis, tooltipFor } = useSeriesRows(props);
type Row = (typeof rows.value)[number];

// One color for every bar when `color` is given, otherwise the theme's chart
// colors cycled per bar. unovis hands the color accessor the bar's index
// within its group, which is 0 for a chart with one series, so the row's own
// index is the one that cycles.
const colorOf = (index: number) =>
  props.color ?? chartColor(index, props.colors);
const color = (row: Row) => colorOf(row.index);
const tooltipTemplate = (row: Row) =>
  tooltipFor(row, row.y, colorOf(row.index));
</script>

<template>
  <ChartFrame
    data-slot="bar-chart"
    :title="props.title"
    :bare="props.bare"
    :loading="props.loading"
    :empty="!hasChartValues(rows)"
    :height="props.height"
    :class="props.class"
  >
    <ChartContainer
      :config="config"
      class="aspect-auto w-full"
      :style="{ height: `${props.height}px` }"
    >
      <VisXYContainer :data="rows" :height="props.height">
        <!-- unovis draws a bar at least barMinHeight tall, even for a row with no number -->
        <VisGroupedBar
          :x="rowX"
          :y="rowY"
          :color="color"
          :rounded-corners="4"
          :bar-min-height="0"
        />
        <VisAxis type="x" v-bind="xAxis" />
        <VisAxis type="y" :tick-line="false" :domain-line="false" />
        <VisCrosshair :x="rowX" :y="rowY" :template="tooltipTemplate" />
        <VisTooltip />
      </VisXYContainer>
    </ChartContainer>
  </ChartFrame>
</template>
