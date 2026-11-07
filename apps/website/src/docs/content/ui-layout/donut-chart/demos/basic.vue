<script setup lang="ts">
import { DonutChart } from "@chelone/vue/charts";

const channels = [
  { channel: "Web", orders: 182 },
  { channel: "Mobile app", orders: 96 },
  { channel: "Marketplace", orders: 64 },
  { channel: "In store", orders: 38 },
];
</script>

<template>
  <!-- `<DonutChart>` splits the total into one slice per row, in the theme's chart colors. It has a width of its own: the preview panel sizes to its content, so "w-full" collapses the chart to 0. -->
  <DonutChart
    class="w-[24rem] max-w-full"
    title="Orders by channel"
    :data="channels"
    label-field="channel"
    value-field="orders"
  />
</template>
