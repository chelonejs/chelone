<script lang="ts">
import type { LooseRecord } from "@chelone/core";

/** Props for {@link TrendChart}. */
export interface TrendChartProps<
  TRow extends object = LooseRecord,
  TX extends keyof TRow & string = keyof TRow & string,
> {
  data: readonly TRow[];
  xField: TX;
  /** A row whose value is not a finite number leaves a gap. */
  yField: keyof TRow & string;
  title?: string;
  /** Any CSS color. Defaults to `var(--primary)`. */
  color?: string;
  /** In pixels. Defaults to 200. */
  height?: number;
  loading?: boolean;
  /** Fills the area under the line with a gradient. */
  area?: boolean;
  /** Draws a smooth curve instead of straight segments. */
  smooth?: boolean;
  /** Leaves out the card and the title. */
  bare?: boolean;
  xTickFormatter?: (value: TRow[TX]) => string;
  yTickFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string) => string;
  class?: string;
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

import { hasChartValues, toCartesianRows } from "@chelone/core";
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
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltipContent,
  componentToString,
} from "../ui/chart";
import ChartFrame from "./chart-frame.vue";

const props = withDefaults(defineProps<TrendChartProps<TRow, TX>>(), {
  color: "var(--primary)",
  height: 200,
  loading: false,
  area: false,
  smooth: false,
  bare: false,
});

const rows = computed(() =>
  toCartesianRows(props.data, props.xField, props.yField),
);
type Row = (typeof rows.value)[number];

const config = computed<ChartConfig>(() => ({
  [props.yField]: { label: props.yField, color: props.color },
}));
const curveType = computed(() =>
  props.smooth ? CurveType.MonotoneX : CurveType.Linear,
);

const x = (row: Row) => row.index;
const y = (row: Row) => row.y;

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

/** The row an axis tick or the crosshair stands on; between two rows there is none. */
function rowAt(position: number | Date) {
  const index = typeof position === "number" ? position : position.getTime();
  return Number.isInteger(index) ? rows.value[index] : undefined;
}

function xLabel(position: number | Date) {
  const row = rowAt(position);
  if (!row) return "";
  if (props.xTickFormatter) return props.xTickFormatter(row.x);
  return row.x == null ? "" : String(row.x);
}

// Few enough rows to name each one; otherwise every step-th row.
const xTicks = computed(() => {
  const step = Math.max(1, Math.ceil(rows.value.length / 7));
  return rows.value.filter((row) => row.index % step === 0).map(x);
});

const yTickFormat = computed(() => {
  const format = props.yTickFormatter;
  return format ? (tick: number | Date) => format(Number(tick)) : undefined;
});

const tooltip = computed(() =>
  componentToString(config.value, ChartTooltipContent, {
    labelFormatter: xLabel,
  }),
);
const tooltipTemplate = (row: Row) => {
  const format = props.tooltipFormatter;
  const value = format && row.y !== null ? format(row.y, props.yField) : row.y;
  return tooltip.value?.({ [props.yField]: value }, row.index) ?? "";
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
          :x="x"
          :y="y"
          :color="fill"
          :opacity="1"
          :curve-type="curveType"
          line
          :line-color="props.color"
        />
        <VisLine
          v-else
          :x="x"
          :y="y"
          :color="props.color"
          :curve-type="curveType"
        />
        <VisAxis
          type="x"
          :grid-line="false"
          :tick-line="false"
          :domain-line="false"
          :tick-values="xTicks"
          :tick-format="xLabel"
        />
        <VisAxis
          type="y"
          :tick-line="false"
          :domain-line="false"
          :tick-format="yTickFormat"
        />
        <VisCrosshair
          snap-to-data
          :x="x"
          :y="y"
          :color="props.color"
          :template="tooltipTemplate"
        />
        <VisTooltip />
      </VisXYContainer>
    </ChartContainer>
  </ChartFrame>
</template>
