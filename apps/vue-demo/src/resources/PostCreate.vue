<script setup lang="ts">
/**
 * `<PostCreate>` — the post create page, the Vue twin of `apps/demo`'s
 * `PostCreate`. `<Create>` owns the create `save` and (by default) redirects to
 * the list on success. Inputs bind to the ambient form; validation comes from
 * the registry's `postSchema` (D6). `views`/`published` seed sensible defaults.
 */

import {
  BooleanInput,
  Create,
  NumberInput,
  ReferenceInput,
  TextInput,
  Toolbar,
} from "@chelone/vue";
</script>

<template>
  <Create resource="posts">
    <div class="flex flex-col gap-4 max-w-xl">
      <TextInput source="title" />
      <TextInput source="body" />
      <ReferenceInput source="author_id" reference="authors" />
      <NumberInput source="views" :default-value="0" />
      <BooleanInput source="published" :default-value="false" />
    </div>
    <template #toolbar>
      <Toolbar />
    </template>
  </Create>
</template>
