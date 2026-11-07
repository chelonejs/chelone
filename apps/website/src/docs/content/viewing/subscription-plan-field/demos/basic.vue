<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { SubscriptionPlanField } from "@chelone/vue";

const plans = [
  { id: "free", name: "Free", price: 0, currency: "USD", interval: "month" },
  { id: "pro", name: "Pro", price: 29, currency: "USD", interval: "month" },
  { id: "team", name: "Team", price: 99, currency: "USD", interval: "month" },
] as const;
const record = { id: 1, plan: "pro" };
</script>

<template>
  <!-- `<SubscriptionPlanField>` looks the plan up by id and shows its name and price in a badge. -->
  <SubscriptionPlanField source="plan" :plans="plans" :record="record" />
</template>
