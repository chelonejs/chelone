<script setup lang="ts">
/**
 * `<CustomerShow>` — the customer detail page, the Vue twin of `apps/demo`'s
 * `CustomerShow`: the customer's fields, then their orders through a
 * `<ReferenceManyField>` that pages on the server (the table's own pager is
 * off; the `<ListPagination>` below it is the one).
 */

import {
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  EmailField,
  ListPagination,
  RecordField,
  ReferenceManyField,
  Show,
} from "@chelone/vue";
</script>

<template>
  <Show resource="customers">
    <RecordField source="name" />
    <RecordField label="Email">
      <EmailField source="email" />
    </RecordField>
    <RecordField source="city" />
    <RecordField label="Orders">
      <ReferenceManyField reference="orders" target="customer_id">
        <DataTable :pagination="false">
          <DataTableCol source="reference" />
          <DataTableCol source="status" />
          <DataTableNumberCol source="total" />
        </DataTable>
        <ListPagination />
      </ReferenceManyField>
    </RecordField>
  </Show>
</template>
