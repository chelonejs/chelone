<script setup lang="ts">
/**
 * `<OrderList>` — the orders list page, the Vue twin of `apps/demo`'s
 * `OrderList`. Customer and Product resolve through `<ReferenceField>`; Status
 * is a `<BadgeField>` and Total a USD `<DataTableNumberCol>`.
 */

import {
  BadgeField,
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  List,
  ReferenceField,
  TextField,
} from "@chelone/vue";
</script>

<template>
  <List resource="orders">
    <DataTable>
      <DataTableCol source="reference" />
      <DataTableCol label="Customer">
        <ReferenceField source="customer_id" reference="customers">
          <TextField source="name" />
        </ReferenceField>
      </DataTableCol>
      <DataTableCol label="Product">
        <ReferenceField source="product_id" reference="products">
          <TextField source="name" />
        </ReferenceField>
      </DataTableCol>
      <DataTableNumberCol source="quantity" />
      <DataTableCol source="status">
        <BadgeField source="status" />
      </DataTableCol>
      <DataTableNumberCol
        source="total"
        :options="{ style: 'currency', currency: 'USD' }"
      />
    </DataTable>
  </List>
</template>
