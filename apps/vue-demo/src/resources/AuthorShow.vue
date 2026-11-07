<script setup lang="ts">
/**
 * `<AuthorShow>` — the read-only author page, the Vue twin of `apps/demo`'s
 * `AuthorShow`. The email shows twice: as a mailto link inside a labeled
 * `<RecordField>`, and as plain text.
 */

import { EmailField, RecordField, Show, TextField } from "@chelone/vue";
</script>

<template>
  <Show resource="authors">
    <div class="flex flex-col gap-4 max-w-xl">
      <RecordField source="name" />
      <RecordField label="Email">
        <EmailField source="email" />
      </RecordField>
      <TextField source="email" />
    </div>
  </Show>
</template>
