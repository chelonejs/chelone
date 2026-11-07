<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  InfiniteList,
  InfinitePagination,
} from "@chelone/vue";
</script>

<template>
  <!-- `<InfinitePagination>` loads another page of posts on demand. -->
  <InfiniteList :per-page="5">
    <DataTable :row-click="false" :pagination="false">
      <DataTableCol source="title" />
    </DataTable>
    <InfinitePagination :auto-load="false" />
  </InfiniteList>
</template>
