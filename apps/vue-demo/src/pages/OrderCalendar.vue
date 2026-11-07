<script lang="ts">
export const title = "Delivery calendar";
export const group = "Orders";
</script>

<script setup lang="ts">
/**
 * The orders on a calendar by delivery date, coloured by status. The Vue twin
 * of `apps/demo`'s `order-calendar.tsx`.
 */

import { CalendarList, List } from "@chelone/vue";

const statusColors = {
  pending: "#b45309",
  shipped: "#0f766e",
  delivered: "#15803d",
  cancelled: "#6b7280",
};

// The in-memory data provider matches filters by equality, so it cannot honour
// the default `delivery_at_gte` / `_lte` range. A real backend gets the default
// and fetches one month at a time.
const noRange = () => ({});
</script>

<template>
  <List resource="orders" title="Delivery calendar">
    <CalendarList
      start-source="delivery_at"
      title-source="reference"
      color-source="status"
      :color-map="statusColors"
      :range-filter="noRange"
    />
  </List>
</template>
