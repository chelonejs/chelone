<script setup lang="ts">
/**
 * `<ProductList>` — the products list page, the Vue twin of `apps/demo`'s
 * `ProductList`: name, SKU and category columns, then price (a currency
 * `<DataTableNumberCol>`) and stock.
 */

import {
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  List,
} from "@chelone/vue";
</script>

<template>
  <List resource="products">
    <DataTable>
      <DataTableCol source="name" />
      <DataTableCol source="sku" />
      <DataTableCol source="category" />
      <DataTableNumberCol
        source="price"
        :options="{ style: 'currency', currency: 'USD' }"
      />
      <DataTableNumberCol source="stock" />
    </DataTable>
  </List>
</template>
