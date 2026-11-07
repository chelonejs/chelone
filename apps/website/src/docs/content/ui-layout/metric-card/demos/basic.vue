<script setup lang="ts">
import { MetricCard } from "@chelone/vue";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
</script>

<template>
  <!-- `<MetricCard>` is a headline number and its change since the last period: up, down or flat. -->
  <div class="grid w-full gap-4 sm:grid-cols-3">
    <MetricCard
      label="Revenue"
      :value="48250"
      :format="money.format"
      :delta="0.124"
    />
    <MetricCard label="Orders" :value="312" :delta="-0.038" />
    <MetricCard label="Active customers" :value="1840" :delta="0" />
  </div>
</template>
