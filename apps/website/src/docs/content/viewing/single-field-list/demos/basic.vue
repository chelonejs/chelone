<script setup lang="ts">
import { List, SingleFieldList } from "@chelone/vue";
</script>

<template>
  <!-- `<SingleFieldList>` lays the ambient list's records out in one inline row, each as a badge holding its record representation. -->
  <List :per-page="4">
    <SingleFieldList />
  </List>
</template>
