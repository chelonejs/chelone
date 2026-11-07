<script setup lang="ts">
/**
 * `<ProductCreate>` — the product create page, the Vue twin of `apps/demo`'s
 * `ProductCreate`: the shared `<ProductInputs>` form.
 */

import { Create, Toolbar } from "@chelone/vue";
import ProductInputs from "./ProductInputs.vue";
</script>

<template>
  <Create resource="products">
    <ProductInputs />
    <Toolbar />
  </Create>
</template>
