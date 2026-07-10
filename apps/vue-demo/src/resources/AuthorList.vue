<script setup lang="ts">
/**
 * `<AuthorList>` — the authors list page. A minimal reference list so the
 * `posts` → `authors` FK resolves against a real, browseable resource: Name and
 * Email columns over the ambient list controller.
 */

import { DataTable, DataTableCol, List } from "@chelone/vue";
</script>

<template>
  <List resource="authors">
    <DataTable>
      <DataTableCol source="name" label="Name" />
      <DataTableCol source="email" label="Email" />
    </DataTable>
  </List>
</template>
