<script setup lang="ts">
/**
 * `<OrderCreate>` — the order create page, the Vue twin of `apps/demo`'s
 * `OrderCreate`. `quantity` and `total` seed sensible defaults.
 */

import { statusChoices } from "@chelone/demo-data";
import {
  Create,
  NumberInput,
  ReferenceInput,
  SelectInput,
  TextInput,
  Toolbar,
} from "@chelone/vue";
</script>

<template>
  <Create resource="orders">
    <div class="flex flex-col gap-4 max-w-xl">
      <TextInput source="reference" />
      <ReferenceInput source="customer_id" reference="customers" />
      <ReferenceInput source="product_id" reference="products" />
      <NumberInput source="quantity" :min="1" :default-value="1" />
      <SelectInput source="status" :choices="statusChoices" />
      <NumberInput source="total" :step="0.01" :min="0" :default-value="0" />
    </div>
    <Toolbar />
  </Create>
</template>
