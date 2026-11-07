<script setup lang="ts">
/**
 * `<PostList>` — the posts list page, the Vue twin of `apps/demo`'s `PostList`.
 * A `<ListLive>` (a `<List>` that refetches on realtime events) whose `#actions`
 * slot holds the "another user" panel. A `<DataTable>` over the ambient list
 * controller: Title, Author (resolved through a `<ReferenceField>` → the
 * author's `name`), Views (a `<DataTableNumberCol>`), Published, plus a per-row
 * `<EditButton>` into the edit page.
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
import SimulateOtherUser from "../realtime-sim.vue";
</script>

<template>
  <ListLive resource="posts">
    <template #actions>
      <SimulateOtherUser />
    </template>
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
  </ListLive>
</template>
