<script setup lang="ts">
/**
 * `<PostList>` — the posts list page, the Vue twin of `apps/demo`'s `PostList`.
 * A `<ListLive>` (a `<List>` that refetches on realtime events) whose `#actions`
 * slot holds the "another user" panel. A `<DataTable>` over the ambient list
 * controller: Title, Author (resolved through a `<ReferenceField>` → the
 * author's `name`), Views (a `<DataTableNumberCol>`), Published, plus a per-row
 * `<EditButton>` into the edit page. The table sits in a `<Configurable>`, so
 * configure mode outlines it and its `#editor` slot holds the column list.
 */

import {
  BooleanField,
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  EditButton,
  ListLive,
  ReferenceField,
  TextField,
} from "@chelone/vue";
import {
  Configurable,
  SortableFieldsSelector,
} from "@chelone/vue/inspector";
import SimulateOtherUser from "../realtime-sim.vue";
</script>

<template>
  <ListLive resource="posts">
    <template #actions>
      <SimulateOtherUser />
    </template>
    <!-- Configure mode outlines the table so its columns can be hidden and
         reordered from the inspector. The table publishes them under
         `posts.datatable`, which is what the editor reads. -->
    <Configurable preference-key="posts.columns" title="Columns">
      <DataTable>
        <DataTableCol source="title" />
        <DataTableCol label="Author">
          <ReferenceField source="author_id" reference="authors">
            <TextField source="name" />
          </ReferenceField>
        </DataTableCol>
        <DataTableNumberCol source="views" label="Views" />
        <DataTableCol source="published" label="Published">
          <BooleanField source="published" />
        </DataTableCol>
        <DataTableCol label="">
          <EditButton />
        </DataTableCol>
      </DataTable>

      <template #editor>
        <SortableFieldsSelector store-key="posts.datatable" />
      </template>
    </Configurable>
  </ListLive>
</template>
