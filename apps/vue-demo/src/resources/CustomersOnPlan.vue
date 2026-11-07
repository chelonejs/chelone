<script setup lang="ts">
/**
 * `<CustomersOnPlan>` — how many customers are on the plan of the one shown,
 * the Vue twin of `apps/demo`'s `CustomersOnPlan`. The number links to that
 * list.
 */

import { Count, useRecordContextRef } from "@chelone/vue";
import { computed } from "vue";

const customer = useRecordContextRef();
const filter = computed(() => ({ plan: customer.value?.plan }));
</script>

<template>
  <Count v-if="customer?.plan != null" :filter="filter" link />
</template>
