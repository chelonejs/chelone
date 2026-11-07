<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { TextField, TranslatableFields } from "@chelone/vue";

const post = {
  id: 1,
  title: {
    en: "On Computable Numbers",
    fr: "Sur les nombres calculables",
  },
};
</script>

<template>
  <!-- A post's title in English and French, with a tab for each locale. -->
  <TranslatableFields :locales="['en', 'fr']" :record="post">
    <TextField source="title" />
  </TranslatableFields>
</template>
