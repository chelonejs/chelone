<script setup lang="ts">
/**
 * `<ProductCreate>` — the product create page, the Vue twin of `apps/demo`'s
 * `ProductCreate`. `price` and `stock` start at 0.
 */

import { categoryChoices } from "@chelone/demo-data";
import {
  Create,
  NumberInput,
  SelectInput,
  TextInput,
  Toolbar,
} from "@chelone/vue";
</script>

<template>
  <Create resource="products">
    <div class="flex flex-col gap-4 max-w-xl">
      <TextInput source="name" />
      <TextInput source="sku" />
      <SelectInput source="category" :choices="categoryChoices" />
      <NumberInput source="price" :step="0.01" :min="0" :default-value="0" />
      <NumberInput source="stock" :min="0" :default-value="0" />
    </div>
    <Toolbar />
  </Create>
</template>
