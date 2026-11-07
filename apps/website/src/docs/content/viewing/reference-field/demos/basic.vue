<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
/**
 * `<ReferenceField>` — the Vue twin of `basic.tsx`: follows a post's
 * `author_id` to the author record and renders that author's `name` through a
 * child `<TextField>`. A bare field reads the ambient record's foreign key.
 */
import { ReferenceField, TextField } from "@chelone/vue";
</script>

<template>
  <p class="text-sm">
    Author:&nbsp;<ReferenceField source="author_id" reference="authors">
      <TextField source="name" />
    </ReferenceField>
  </p>
</template>
