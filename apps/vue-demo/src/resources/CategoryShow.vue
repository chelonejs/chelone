<script setup lang="ts">
/**
 * `<CategoryShow>` — the read-only category, the Vue twin of `apps/demo`'s
 * `CategoryShow`. The name reads back in each locale, one tab each.
 */

import { RecordField, Show, TextField, TranslatableFields } from "@chelone/vue";
</script>

<template>
  <Show resource="categories">
    <div class="flex flex-col gap-4 max-w-xl">
      <RecordField label="Name">
        <TranslatableFields :locales="['en', 'pt', 'fr']">
          <TextField source="name" />
        </TranslatableFields>
      </RecordField>
    </div>
  </Show>
</template>
