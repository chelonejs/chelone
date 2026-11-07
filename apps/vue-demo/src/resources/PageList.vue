<script setup lang="ts">
/**
 * `<PageList>` — the pages list page, the Vue twin of `apps/demo`'s `PageList`.
 * Status is a `<BadgeField>` and Author resolves through a `<ReferenceField>`;
 * the HTML body and markdown release notes stay out of the table.
 */

import {
  BadgeField,
  DataTable,
  DataTableCol,
  EditButton,
  List,
  ReferenceField,
  TextField,
} from "@chelone/vue";
</script>

<template>
  <List resource="pages">
    <DataTable>
      <DataTableCol source="title" />
      <DataTableCol source="slug" />
      <DataTableCol source="status">
        <BadgeField source="status" />
      </DataTableCol>
      <DataTableCol label="Author">
        <ReferenceField source="author_id" reference="authors">
          <TextField source="name" />
        </ReferenceField>
      </DataTableCol>
      <DataTableCol label="">
        <EditButton />
      </DataTableCol>
    </DataTable>
  </List>
</template>
