<script setup lang="ts">
/**
 * `<ProductShow>` — the product detail page, the Vue twin of `apps/demo`'s
 * `ProductShow`: labelled `<RecordField>`s, with the price as a currency
 * `<NumberField>`.
 */

import { NumberField, RecordField, Show, TextField } from "@chelone/vue";
</script>

<template>
  <Show resource="products">
    <RecordField source="name" />
    <RecordField source="sku" />
    <RecordField source="category" />
    <RecordField label="Price">
      <NumberField
        source="price"
        :options="{ style: 'currency', currency: 'USD' }"
      />
    </RecordField>
    <RecordField label="Stock">
      <NumberField source="stock" />
    </RecordField>
    <TextField source="name" />
  </Show>
</template>
