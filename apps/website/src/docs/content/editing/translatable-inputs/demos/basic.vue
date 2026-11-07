<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { TextInput, TranslatableInputs } from "@chelone/vue";
</script>

<template>
  <!-- `<TranslatableInputs>` shows an EN and FR tab, each holding its own "Name" input. -->
  <div class="w-full max-w-sm">
    <TranslatableInputs :locales="['en', 'fr']">
      <TextInput source="name" />
    </TranslatableInputs>
  </div>
</template>
