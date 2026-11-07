<script setup lang="ts">
import {
  BooleanField,
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  FieldsSelector,
  List,
} from "@chelone/vue";

const storeKey = "posts.datatable";
</script>

<template>
  <!-- `<FieldsSelector>` lists the columns the post table publishes under its store key, each with a switch and move buttons. -->
  <List :per-page="5">
    <!-- Stacked, as in the React twin: the preview is 590px wide, and a 256px
         selector beside the table leaves the table too narrow to read. -->
    <div class="flex min-w-0 flex-col gap-4">
      <div class="min-w-0">
        <DataTable :row-click="false" :store-key="storeKey">
          <DataTableCol source="title" />
          <DataTableNumberCol source="views" />
          <DataTableCol source="published">
            <BooleanField source="published" />
          </DataTableCol>
        </DataTable>
      </div>
      <div class="min-w-0 rounded-md border p-4">
        <FieldsSelector :store-key="storeKey" />
      </div>
    </div>
  </List>
</template>
