<script setup lang="ts">
/**
 * `<ListNoResults>` offers to clear a search that matches no posts. The
 * controller is built here and published with `provideListContext`, the Vue
 * analog of React's `<ListContextProvider>`.
 */
import {
  ListNoResults,
  provideListContext,
  SimpleList,
  useListController,
} from "@chelone/vue";

const controller = useListController({
  resource: "posts",
  filterDefaultValues: { q: "No matching posts" },
  syncWithLocation: false,
});
provideListContext(controller);
</script>

<template>
  <SimpleList :link-type="false">
    <template #primary-text="{ record }">{{ record.title }}</template>
    <template #empty>
      <ListNoResults />
    </template>
  </SimpleList>
</template>
