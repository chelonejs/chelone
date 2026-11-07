<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  InfiniteList,
  InfinitePagination,
  ReferenceField,
  TextField,
} from "@chelone/vue";
</script>

<template>
  <!-- `<InfiniteList>` over the seeded `posts`: five rows at first, and each press of Load more appends the next five under them. -->
  <div class="w-full">
    <InfiniteList :per-page="5" title="Latest posts">
      <DataTable :row-click="false" :pagination="false">
        <DataTableCol source="title" />
        <DataTableCol label="Author">
          <ReferenceField source="author_id" reference="authors">
            <TextField source="name" />
          </ReferenceField>
        </DataTableCol>
        <DataTableNumberCol source="views" />
      </DataTable>
      <InfinitePagination :auto-load="false" />
    </InfiniteList>
  </div>
</template>
