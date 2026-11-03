<script setup lang="ts">
/**
 * `<PlaceList>` — the places list page: Name and Address columns over the
 * ambient list controller, in the style of `<AuthorList>`.
 */

import { DataTable, DataTableCol, List } from "@chelone/vue";
</script>

<template>
  <List resource="places">
    <DataTable>
      <DataTableCol source="name" label="Name" />
      <DataTableCol source="address" label="Address" />
    </DataTable>
  </List>
</template>
