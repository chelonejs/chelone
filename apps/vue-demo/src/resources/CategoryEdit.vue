<script setup lang="ts">
/**
 * `<CategoryEdit>` — the category edit page, the Vue twin of `apps/demo`'s
 * `CategoryEdit`. The name is written in each locale side by side.
 */

import { Edit, TextInput, Toolbar, TranslatableInputs } from "@chelone/vue";
</script>

<template>
  <Edit resource="categories">
    <div class="flex flex-col gap-4 max-w-xl">
      <TranslatableInputs :locales="['en', 'pt', 'fr']">
        <TextInput source="name" />
      </TranslatableInputs>
    </div>
    <Toolbar />
  </Edit>
</template>
