<script setup lang="ts">
/**
 * `<PostList>` — the posts list page, the Vue twin of `apps/demo`'s `PostList`.
 * A `<DataTable>` over the ambient list controller: Title, Author (resolved
 * through a `<ReferenceField>` → the author's `name`), Views, Published, plus a
 * per-row `<EditLink>` into the edit page.
 */

import {
  DataTable,
  DataTableCol,
  List,
  ReferenceField,
  TextField,
} from "@chelone/vue";
import EditLink from "./EditLink.vue";
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
      <DataTableCol source="views" label="Views" />
      <DataTableCol source="published" label="Published" />
      <DataTableCol label="">
        <EditLink />
      </DataTableCol>
    </DataTable>
  </List>
</template>
