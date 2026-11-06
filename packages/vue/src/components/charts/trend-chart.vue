<script lang="ts">
import type { LooseRecord } from "@chelone/core";
import type { SeriesChartProps } from "./series-chart";

/** Props for {@link TrendChart}. */
export interface TrendChartProps<
  TRow extends object = LooseRecord,
  TX extends keyof TRow & string = keyof TRow & string,
> extends SeriesChartProps<TRow, TX> {
  /** Fills the area under the line with a gradient. */
  area?: boolean;
  /** Draws a smooth curve instead of straight segments. */
  smooth?: boolean;
  xTickFormatter?: (value: TRow[TX]) => string;
  yTickFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string) => string;
}

let gradientCount = 0;
const nextGradientId = () => {
  gradientCount += 1;
  return `chelone-trend-${gradientCount}`;
};

const ATTRIBUTE_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
/** `svgDefs` is an HTML string, so a color goes in as an escaped attribute value. */
const escapeAttribute = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ATTRIBUTE_ESCAPES[c] ?? c);
</script>

<script setup lang="ts" generic="TRow extends object = LooseRecord, TX extends keyof TRow & string = keyof TRow & string">
/**
 * `<TrendChart>` — a line or an area over one numeric field, the Vue twin of
 * `@chelone/react`'s `charts/trend-chart.tsx`, drawn with unovis. x is the row
 * index, so any x value keeps its order; the x axis maps each tick back to the
 * row's own `x`. Needs the optional `@unovis/vue` and `@unovis/ts` peers.
 *
 * @example
 * import { TrendChart } from "@chelone/vue/charts";
 *
 * <TrendChart :data="visits" x-field="day" y-field="count" title="Visits" />
 */

import { hasChartValues } from "@chelone/core";
import { CurveType } from "@unovis/ts";
import {
  VisArea,
  VisAxis,
  VisCrosshair,
  VisLine,
  VisTooltip,
  VisXYContainer,
} from "@unovis/vue";
import { computed } from "vue";
import { ChartContainer } from "../ui/chart";
import ChartFrame from "./chart-frame.vue";
import { rowX, useSeriesRows, rowY } from "./series-chart";

const props = withDefaults(defineProps<TrendChartProps<TRow, TX>>(), {
  color: "var(--primary)",
  height: 200,
  loading: false,
  area: false,
  smooth: false,
  bare: false,
});

const { rows, config, xAxis, tooltipFor } = useSeriesRows(props);
type Row = (typeof rows.value)[number];

const curveType = computed(() =>
  props.smooth ? CurveType.MonotoneX : CurveType.Linear,
);

const gradientId = nextGradientId();
const fill = () => `url(#${gradientId})`;
const svgDefs = computed(() =>
  props.area
    ? `<linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="5%" stop-color="${escapeAttribute(props.color)}" stop-opacity="0.4"/>` +
      `<stop offset="95%" stop-color="${escapeAttribute(props.color)}" stop-opacity="0.05"/>` +
      "</linearGradient>"
    : undefined,
);

const yTickFormat = computed(() => {
  const format = props.yTickFormatter;
  return format ? (tick: number | Date) => format(Number(tick)) : undefined;
});

const tooltipTemplate = (row: Row) => {
  const format = props.tooltipFormatter;
  const value = format && row.y !== null ? format(row.y, props.yField) : row.y;
  return tooltipFor(row, value);
};
</script>

<template>
  <ChartFrame
    data-slot="trend-chart"
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
      <VisXYContainer
        :data="rows"
        :height="props.height"
        :svg-defs="svgDefs"
      >
        <VisArea
          v-if="props.area"
          :x="rowX"
          :y="rowY"
          :color="fill"
          :opacity="1"
          :curve-type="curveType"
          line
          :line-color="props.color"
        />
        <VisLine
          v-else
          :x="rowX"
          :y="rowY"
          :color="props.color"
          :curve-type="curveType"
        />
        <VisAxis type="x" v-bind="xAxis" />
        <VisAxis
          type="y"
          :tick-line="false"
          :domain-line="false"
          :tick-format="yTickFormat"
        />
        <VisCrosshair
          snap-to-data
          :x="rowX"
          :y="rowY"
          :color="props.color"
          :template="tooltipTemplate"
        />
        <VisTooltip />
      </VisXYContainer>
    </ChartContainer>
  </ChartFrame>
</template>
