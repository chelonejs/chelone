<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { provideRecordContext, ReferenceOneField, TextField } from "@chelone/vue";

// The author whose most viewed post the page shows.
provideRecordContext({ id: 1, name: "Ada Lovelace" });
</script>

<template>
  <!-- `<ReferenceOneField>` fetches the first post whose `author_id` matches this author and renders its `title` off the referenced record. -->
  <div class="flex flex-col gap-1 text-sm">
    <span class="text-muted-foreground">Most viewed post</span>
    <ReferenceOneField
      reference="posts"
      target="author_id"
      :sort="{ field: 'views', order: 'DESC' }"
    >
      <TextField source="title" />
    </ReferenceOneField>
  </div>
</template>
