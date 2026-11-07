<script setup lang="ts">
/**
 * `<OrderEdit>` — the order edit page, the Vue twin of `apps/demo`'s
 * `OrderEdit`. The Vue `<ReferenceInput>` renders its own select, so the React
 * twin's `<SelectInput>` child has no counterpart here.
 */

import { statusChoices } from "@chelone/demo-data";
import {
  Edit,
  NumberInput,
  ReferenceInput,
  SelectInput,
  TextInput,
  Toolbar,
} from "@chelone/vue";
</script>

<template>
  <Edit resource="orders">
    <div class="flex flex-col gap-4 max-w-xl">
      <TextInput source="reference" />
      <ReferenceInput source="customer_id" reference="customers" />
      <ReferenceInput source="product_id" reference="products" />
      <NumberInput source="quantity" :min="1" />
      <SelectInput source="status" :choices="statusChoices" />
      <NumberInput source="total" :step="0.01" :min="0" />
    </div>
    <Toolbar />
  </Edit>
</template>
