<script setup lang="ts">
/**
 * `<ProductEdit>` — the product edit page, the Vue twin of `apps/demo`'s
 * `ProductEdit`. `products` has no schema, so only what the inputs declare is
 * validated. `<Toolbar>` renders the `<SaveButton>`.
 */

import { categoryChoices } from "@chelone/demo-data";
import {
  Edit,
  NumberInput,
  SelectInput,
  TextInput,
  Toolbar,
} from "@chelone/vue";
</script>

<template>
  <Edit resource="products">
    <div class="flex flex-col gap-4 max-w-xl">
      <TextInput source="name" />
      <TextInput source="sku" />
      <SelectInput source="category" :choices="categoryChoices" />
      <NumberInput source="price" :step="0.01" :min="0" />
      <NumberInput source="stock" :min="0" />
    </div>
    <Toolbar />
  </Edit>
</template>
