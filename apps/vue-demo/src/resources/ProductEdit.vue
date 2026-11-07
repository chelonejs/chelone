<script setup lang="ts">
/**
 * `<ProductEdit>` — the product edit page, the Vue twin of `apps/demo`'s
 * `ProductEdit`; its header links back to the product page. `products` has no
 * schema, so only what the inputs declare is validated. `<Toolbar>` renders the `<SaveButton>`.
 */

import { Edit, ShowButton, Toolbar } from "@chelone/vue";
import ProductInputs from "./ProductInputs.vue";
</script>

<template>
  <Edit resource="products">
    <template #actions>
      <ShowButton />
    </template>
    <ProductInputs />
    <Toolbar />
  </Edit>
</template>
