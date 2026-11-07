<script setup lang="ts">
import { CancelButton, Create, TextInput } from "@chelone/vue";
</script>

<template>
  <!-- `<CancelButton>` returns to the previous page from a new post form. -->
  <Create>
    <TextInput source="title" />
    <CancelButton />
  </Create>
</template>
