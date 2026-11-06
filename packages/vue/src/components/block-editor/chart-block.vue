<script setup lang="ts">
/** The view of the chart block: a resource's first rows grouped by a category, drawn as a bar, line or pie chart. */

import { aggregateChartData } from "@chelone/core";
import { computed } from "vue";
import { useGetList } from "../../data/queries";
import BarChart from "../charts/bar-chart.vue";
import DonutChart from "../charts/donut-chart.vue";
import TrendChart from "../charts/trend-chart.vue";
import { useDataBlockGate } from "./data-block-parts";
import DataBlockState from "./data-block-state.vue";
import type { ChartAttrs } from "./data-blocks";

const props = defineProps<{
  attrs: ChartAttrs;
  mode: "edit" | "read";
  selected?: boolean;
  updateAttrs?: (attrs: Partial<ChartAttrs>) => void;
}>();

// The view is remounted when the resource changes, so it reads it once.
const { resource } = props.attrs;
const configured = computed(
  () => resource !== "" && props.attrs.category !== "",
);
const { data, isPending, isError } = useGetList(
  resource,
  () => ({ pagination: { page: 1, perPage: props.attrs.perPage } }),
  { enabled: configured },
);
const gate = useDataBlockGate(
  "chart",
  { configured, isError },
  {
    empty: "Choose a resource and a category",
    error: "The chart data could not be loaded",
  },
);
const rows = computed(() =>
  aggregateChartData(data.value?.data ?? [], {
    category: props.attrs.category,
    value: props.attrs.value,
    aggregate: props.attrs.aggregate,
  }),
);
</script>

<template>
  <DataBlockState v-if="gate" :kind="gate.kind">{{ gate.message }}</DataBlockState>
  <div v-else class="my-2">
    <TrendChart
      v-if="attrs.type === 'line'"
      :data="rows"
      bare
      :loading="isPending"
      x-field="name"
      y-field="value"
    />
    <DonutChart
      v-else-if="attrs.type === 'pie'"
      :data="rows"
      bare
      :loading="isPending"
      label-field="name"
      value-field="value"
    />
    <BarChart
      v-else
      :data="rows"
      bare
      :loading="isPending"
      x-field="name"
      y-field="value"
    />
  </div>
</template>
