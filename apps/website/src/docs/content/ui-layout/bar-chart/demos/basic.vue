<script setup lang="ts">
import { BarChart } from "@chelone/vue/charts";

const revenue = [
  { month: "Jan", revenue: 12400 },
  { month: "Feb", revenue: 15800 },
  { month: "Mar", revenue: 14200 },
  { month: "Apr", revenue: 18900 },
  { month: "May", revenue: 21300 },
  { month: "Jun", revenue: 19700 },
];
</script>

<template>
  <!-- `<BarChart>` draws one bar per month. It fetches nothing: the rows come from the page. -->
  <!-- A width of its own: the preview panel sizes to its content, so "w-full" collapses the chart to 0. -->
  <BarChart
    class="w-[32rem] max-w-full"
    title="Revenue by month"
    :data="revenue"
    x-field="month"
    y-field="revenue"
  />
</template>
