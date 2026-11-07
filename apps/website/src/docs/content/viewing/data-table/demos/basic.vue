<script setup lang="ts">
/**
 * `<DataTable>` — the Vue twin of `basic.tsx`: a table over the seeded posts,
 * with a text column, a reference column, a number column and a boolean column,
 * sortable from the header. React's `DataTable.Col` / `DataTable.NumberCol` are
 * the named exports `<DataTableCol>` / `<DataTableNumberCol>`.
 */
import {
  BooleanField,
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  List,
  ReferenceField,
  TextField,
} from "@chelone/vue";
</script>

<template>
  <List :per-page="5" title="">
    <DataTable :row-click="false">
      <DataTableCol source="title" />
      <DataTableCol label="Author">
        <ReferenceField source="author_id" reference="authors" :link="false">
          <TextField source="name" />
        </ReferenceField>
      </DataTableCol>
      <DataTableNumberCol source="views" />
      <DataTableCol source="published">
        <BooleanField source="published" />
      </DataTableCol>
    </DataTable>
  </List>
</template>
