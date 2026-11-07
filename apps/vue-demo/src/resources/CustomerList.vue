<script setup lang="ts">
/**
 * `<CustomerList>` — the customers list page, the Vue twin of `apps/demo`'s
 * `CustomerList`: Name, Email (an `<EmailField>` mailto link) and City columns
 * over the ambient list controller.
 */

import { DataTable, DataTableCol, EmailField, List } from "@chelone/vue";
</script>

<template>
  <List resource="customers">
    <DataTable>
      <DataTableCol source="name" />
      <DataTableCol source="email">
        <EmailField source="email" />
      </DataTableCol>
      <DataTableCol source="city" />
    </DataTable>
  </List>
</template>
