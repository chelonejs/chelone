<script setup lang="ts">
/**
 * `<CategoryList>` — the categories list page, the Vue twin of `apps/demo`'s
 * `CategoryList`: a `<TreeList>` nested by `parent_id`, titled by the English
 * name. The tree is the whole list, so one page has to hold every category.
 */

import { List, TreeList } from "@chelone/vue";
</script>

<template>
  <List resource="categories" :per-page="100">
    <TreeList parent-source="parent_id" title-source="name.en" default-expanded />
  </List>
</template>
