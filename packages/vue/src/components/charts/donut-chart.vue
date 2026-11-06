<script lang="ts">
import type { LooseRecord } from "@chelone/core";

/** Props for {@link DonutChart}. */
export interface DonutChartProps<TRow extends object = LooseRecord> {
  data: readonly TRow[];
  labelField: keyof TRow & string;
  /** A row whose value is not a number above zero draws no segment. */
  valueField: keyof TRow & string;
  title?: string;
  /** Any CSS colors, cycled over the segments. Defaults to the theme's chart colors. */
  colors?: readonly string[];
  /** In pixels. Defaults to 200. */
  height?: number;
  loading?: boolean;
  /** Leaves out the card and the title. */
  bare?: boolean;
  class?: string;
}
</script>

<script setup lang="ts" generic="TRow extends object = LooseRecord">
/**
 * `<DonutChart>` — one segment per row with a value above zero, the Vue twin
 * of `@chelone/react`'s `charts/donut-chart.tsx`, drawn with unovis. Needs the
 * optional `@unovis/vue` and `@unovis/ts` peers.
 *
 * @example
 * import { DonutChart } from "@chelone/vue/charts";
 *
 * <DonutChart :data="plans" label-field="plan" value-field="seats" />
 */

import {
  chartColor,
  DEFAULT_CHART_COLORS,
  type DonutSlice,
  toDonutSlices,
} from "@chelone/core";
import { Donut } from "@unovis/ts";
import { VisDonut, VisSingleContainer, VisTooltip } from "@unovis/vue";
import { computed } from "vue";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltipContent,
  componentToString,
} from "../ui/chart";
import ChartFrame from "./chart-frame.vue";

const props = withDefaults(defineProps<DonutChartProps<TRow>>(), {
  colors: () => DEFAULT_CHART_COLORS,
  height: 200,
  loading: false,
  bare: false,
});

const slices = computed(() =>
  toDonutSlices(props.data, props.labelField, props.valueField),
);

// Slice labels come from row data, and ChartStyle writes config keys raw into a
// <style>, so no label goes in the config. The tooltip reads the label from the
// slice itself.
const config: ChartConfig = { value: {} };

const value = (slice: DonutSlice) => slice.value;
const color = (_slice: DonutSlice, index: number) =>
  chartColor(index, props.colors);
// The default ring is 20px wide; the React twin's is 30% of the radius.
const arcWidth = computed(() => Math.round(props.height * 0.15));

const tooltipTemplate = (arc: { data: DonutSlice; index: number }) =>
  componentToString(config, ChartTooltipContent, {
    nameKey: "label",
    hideLabel: true,
    color: color(arc.data, arc.index),
  })?.(arc) ?? "";
const triggers = { [Donut.selectors.segment]: tooltipTemplate };
</script>

<template>
  <ChartFrame
    data-slot="donut-chart"
    :title="props.title"
    :bare="props.bare"
    :loading="props.loading"
    :empty="slices.length === 0"
    :height="props.height"
    :class="props.class"
  >
    <ChartContainer
      :config="config"
      class="aspect-auto w-full"
      :style="{ height: `${props.height}px` }"
    >
      <VisSingleContainer :data="slices" :height="props.height">
        <VisDonut
          :value="value"
          :color="color"
          :arc-width="arcWidth"
          :show-background="false"
        />
        <VisTooltip :triggers="triggers" />
      </VisSingleContainer>
    </ChartContainer>
  </ChartFrame>
</template>
