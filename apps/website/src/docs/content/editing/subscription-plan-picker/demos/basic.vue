<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { SubscriptionPlanPicker } from "@chelone/vue";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "USD",
    interval: "month",
    features: ["1 project"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 12,
    currency: "USD",
    interval: "month",
    features: ["Unlimited projects", "Priority support"],
  },
  {
    id: "team",
    name: "Team",
    price: 120,
    currency: "USD",
    interval: "year",
    features: ["Everything in Pro", "Shared workspaces"],
  },
] as const;
</script>

<template>
  <!-- `<SubscriptionPlanPicker>` shows three plan cards, with "Pro" selected and marked as recommended. -->
  <SubscriptionPlanPicker
    source="plan"
    :plans="plans"
    recommended-plan-id="pro"
    default-value="pro"
  />
</template>
