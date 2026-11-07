<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { AutocompleteArrayInput, ReferenceArrayInput } from "@chelone/vue";

// Ada Lovelace and Grace Hopper, already picked.
const authorIds = [1, 3];
</script>

<template>
  <!-- `<ReferenceArrayInput>` edits a post's `author_ids` against the `authors` resource. -->
  <div class="w-full max-w-sm">
    <ReferenceArrayInput source="author_ids" reference="authors">
      <AutocompleteArrayInput :default-value="authorIds" />
    </ReferenceArrayInput>
  </div>
</template>
