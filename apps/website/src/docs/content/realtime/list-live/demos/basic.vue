<script lang="ts">
export const mode = "realtime";
</script>

<script setup lang="ts">
import {
  Button,
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  ListLive,
  useCreate,
} from "@chelone/vue";

// Writes a post the way a second user's browser would, over the same provider.
const { mutate } = useCreate("posts");
const addPost = () =>
  mutate({
    data: {
      title: `Post added at ${new Date().toLocaleTimeString()}`,
      body: "Added by another user.",
      author_id: 1,
      views: 0,
      published: false,
    },
  });
</script>

<template>
  <!-- `<ListLive>` refetches when a record of its resource changes: the table's pager total moves when the button adds a post, with no reload. -->
  <ListLive :per-page="5">
    <template #actions>
      <Button variant="outline" size="sm" @click="addPost">
        Another user adds a post
      </Button>
    </template>
    <DataTable>
      <DataTableCol source="title" />
      <DataTableNumberCol source="views" />
    </DataTable>
  </ListLive>
</template>
