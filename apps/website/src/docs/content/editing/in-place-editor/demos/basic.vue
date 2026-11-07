<script setup lang="ts">
import { InPlaceEditor, RecordField, Show } from "@chelone/vue";
</script>

<template>
  <!-- Click the title to edit it; Enter saves, and a focus move out cancels. -->
  <Show :id="1" title="">
    <RecordField label="Title">
      <InPlaceEditor source="title" />
    </RecordField>
  </Show>
</template>
