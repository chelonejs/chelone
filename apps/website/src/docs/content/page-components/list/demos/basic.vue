<script setup lang="ts">
import {
  BooleanField,
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  EditButton,
  List,
  ReferenceField,
  TextField,
} from "@chelone/vue";
</script>

<template>
  <!-- A `<List>` over the seeded `posts`: a `<DataTable>` with a text column, a reference column, a number column, a boolean, and a row action. `<DataTable>` renders `<ListPagination>` below the table by default, so the seeded posts page through. -->
  <List>
    <DataTable>
      <DataTableCol source="title" />
      <DataTableCol label="Author">
        <ReferenceField source="author_id" reference="authors">
          <TextField source="name" />
        </ReferenceField>
      </DataTableCol>
      <DataTableNumberCol source="views" />
      <DataTableCol source="published">
        <BooleanField source="published" />
      </DataTableCol>
      <DataTableCol>
        <EditButton />
      </DataTableCol>
    </DataTable>
  </List>
</template>
