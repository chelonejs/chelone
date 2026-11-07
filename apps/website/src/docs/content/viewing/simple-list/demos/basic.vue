<script setup lang="ts">
import { List, SimpleList } from "@chelone/vue";
</script>

<template>
  <!-- `<SimpleList>` turns the ambient list's posts into tappable rows that link to each post's edit page. -->
  <List :per-page="5">
    <SimpleList>
      <template #primary-text="{ record }">{{ record.title }}</template>
      <template #secondary-text="{ record }">{{ record.views }} views</template>
    </SimpleList>
  </List>
</template>
