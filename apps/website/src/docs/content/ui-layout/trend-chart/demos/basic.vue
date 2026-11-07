<script setup lang="ts">
import { TrendChart } from "@chelone/vue/charts";

const visits = [
  { day: "Mon", visits: 420 },
  { day: "Tue", visits: 510 },
  { day: "Wed", visits: 480 },
  { day: "Thu", visits: 630 },
  { day: "Fri", visits: 720 },
  { day: "Sat", visits: 560 },
  { day: "Sun", visits: 390 },
];
</script>

<template>
  <!-- `<TrendChart>` follows one number across the days: a smooth line with the area under it filled. It has a width of its own: the preview panel sizes to its content, so "w-full" collapses the chart to 0. -->
  <TrendChart
    class="w-[32rem] max-w-full"
    title="Visits this week"
    :data="visits"
    x-field="day"
    y-field="visits"
    area
    smooth
  />
</template>
