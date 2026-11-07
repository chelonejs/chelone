<script setup lang="ts">
/**
 * `<AuthorCreate>` — the author create page, the Vue twin of `apps/demo`'s
 * `AuthorCreate`. Validation comes from the registry's `authorSchema`.
 */

import { Create, TextInput, Toolbar } from "@chelone/vue";
</script>

<template>
  <Create resource="authors">
    <div class="flex flex-col gap-4 max-w-xl">
      <TextInput source="name" />
      <TextInput source="email" />
    </div>
    <template #toolbar>
      <Toolbar />
    </template>
  </Create>
</template>
