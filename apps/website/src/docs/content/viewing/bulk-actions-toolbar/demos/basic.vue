<script lang="ts">
/**
 * The rows are selected by a child of `<List>`: `useListContext` resolves only
 * below the `<List>` that publishes it, and the demo's own setup runs before
 * that `<List>` exists.
 */
import { useListContext } from "@chelone/vue";
import { defineComponent, onMounted } from "vue";

const SelectTwoPosts = defineComponent({
  setup() {
    const list = useListContext();
    onMounted(() => list.select([1, 2]));
    return () => null;
  },
});
</script>

<script setup lang="ts">
import {
  BulkExportButton,
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  List,
} from "@chelone/vue";
</script>

<template>
  <!-- `<DataTable>` renders `<BulkActionsToolbar>` once a row is selected, and its `#bulkActions` slot fills the toolbar. Here it offers export for two initially selected posts. -->
  <div class="w-full pb-28">
    <List :per-page="5">
      <SelectTwoPosts />
      <DataTable :row-click="false">
        <template #bulkActions>
          <BulkExportButton />
        </template>
        <DataTableCol source="title" />
        <DataTableNumberCol source="views" />
      </DataTable>
    </List>
  </div>
</template>
