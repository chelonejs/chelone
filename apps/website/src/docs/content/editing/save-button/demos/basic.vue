<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { ReferenceInput, SaveButton, TextInput } from "@chelone/vue";
</script>

<template>
  <!-- `<SaveButton>` submits the create form around it, which holds a whole post, so the click creates one. -->
  <div class="flex w-full max-w-sm flex-col gap-4">
    <TextInput source="title" default-value="Notes on the Analytical Engine" />
    <TextInput source="body" default-value="Body copy for a new post." />
    <ReferenceInput source="author_id" reference="authors" />
    <SaveButton />
  </div>
</template>
