<script setup lang="ts">
import { RecordField, ShowLive, useUpdate } from "@chelone/vue";

// Writes through the provider the way another user's browser would.
const { mutate } = useUpdate("posts");
const rename = () =>
  mutate({
    id: 1,
    data: { title: `Renamed at ${new Date().toLocaleTimeString()}` },
  });
</script>

<template>
  <!-- The record refetches when it changes, with no reload and no refetch call. -->
  <ShowLive :id="1" title="">
    <div class="flex flex-col gap-4">
      <RecordField source="title" />
      <button
        type="button"
        class="w-fit rounded-md border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
        @click="rename"
      >
        Another user renames this post
      </button>
    </div>
  </ShowLive>
</template>
