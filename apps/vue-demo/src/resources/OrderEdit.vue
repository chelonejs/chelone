<script setup lang="ts">
/**
 * `<OrderEdit>` — the order edit page, the Vue twin of `apps/demo`'s
 * `OrderEdit`. The relation and delivery inputs live in `OrderRelationInputs`
 * and `OrderDeliveryInputs`, which `<OrderCreate>` shares.
 */

import { statusChoices } from "@chelone/demo-data";
import {
  Edit,
  NumberInput,
  SelectInput,
  TextInput,
  Toolbar,
} from "@chelone/vue";
import OrderDeliveryInputs from "./OrderDeliveryInputs.vue";
import OrderRelationInputs from "./OrderRelationInputs.vue";
</script>

<template>
  <Edit resource="orders">
    <div class="flex flex-col gap-4 max-w-xl">
      <TextInput source="reference" />
      <OrderRelationInputs />
      <NumberInput source="quantity" :min="1" />
      <OrderDeliveryInputs />
      <SelectInput source="status" :choices="statusChoices" />
      <NumberInput source="total" :step="0.01" :min="0" />
    </div>
    <Toolbar />
  </Edit>
</template>
