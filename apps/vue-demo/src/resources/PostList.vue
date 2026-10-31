<script setup lang="ts">
/**
 * `<PostList>` — the posts list page, the Vue twin of `apps/demo`'s `PostList`.
 * A `<DataTable>` over the ambient list controller: Title, Author (resolved
 * through a `<ReferenceField>` → the author's `name`), Views (a
 * `<DataTableNumberCol>`), Published, plus a per-row `<EditButton>` into the
 * edit page.
 */

import {
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
  <List resource="posts">
    <DataTable>
      <DataTableCol source="title" />
      <DataTableCol label="Author">
        <ReferenceField source="author_id" reference="authors">
          <TextField source="name" />
        </ReferenceField>
      </DataTableCol>
      <DataTableNumberCol source="views" label="Views" />
      <DataTableCol source="published" label="Published" />
      <DataTableCol label="">
        <EditButton />
      </DataTableCol>
    </DataTable>
  </List>
</template>
