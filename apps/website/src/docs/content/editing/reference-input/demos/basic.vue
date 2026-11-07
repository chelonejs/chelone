<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
/**
 * `<ReferenceInput>` — the Vue twin of `basic.tsx`: edits a post's `author_id`
 * by choosing from the `authors` resource. Vue renders the choice list itself
 * as a select, so there is no child input to pass.
 */
import { ReferenceInput } from "@chelone/vue";
</script>

<template>
  <div class="w-full max-w-sm">
    <ReferenceInput source="author_id" reference="authors" />
  </div>
</template>
