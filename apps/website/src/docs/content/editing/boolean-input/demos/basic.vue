<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
/** `<BooleanInput>` — the Vue twin of `basic.tsx`: toggles whether a post is published. */
import { BooleanInput } from "@chelone/vue";
</script>

<template>
  <BooleanInput source="published" :default-value="false" />
</template>
