<script setup lang="ts">
/**
 * When an order is delivered and how long the warehouse needs to prepare it,
 * shared by `<OrderEdit>` and `<OrderCreate>`.
 */

import { DateTimeInput, DurationInput, TimeInput } from "@chelone/vue";
</script>

<template>
  <DateTimeInput source="delivery_at" label="Delivery" />
  <TimeInput source="slot" label="Slot opens" />
  <DurationInput source="handling" label="Handling time" :units="['h', 'm']" />
</template>
