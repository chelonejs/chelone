<script setup lang="ts">
/**
 * `<ProductEdit>` — the product edit page, the Vue twin of `apps/demo`'s
 * `ProductEdit`. `products` has no schema, so only what the inputs declare is
 * validated. `<Toolbar>` renders the `<SaveButton>`.
 */

import { Edit, Toolbar } from "@chelone/vue";
import ProductInputs from "./ProductInputs.vue";
</script>

<template>
  <Edit resource="products">
    <ProductInputs />
    <Toolbar />
  </Edit>
</template>
