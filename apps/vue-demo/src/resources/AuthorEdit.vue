<script setup lang="ts">
/**
 * `<AuthorEdit>` — the author edit page, the Vue twin of `apps/demo`'s
 * `AuthorEdit`. Validation comes from the registry's `authorSchema`.
 */

import { Edit, TextInput, Toolbar } from "@chelone/vue";
</script>

<template>
  <Edit resource="authors">
    <div class="flex flex-col gap-4 max-w-xl">
      <TextInput source="name" />
      <TextInput source="email" />
    </div>
    <Toolbar />
  </Edit>
</template>
