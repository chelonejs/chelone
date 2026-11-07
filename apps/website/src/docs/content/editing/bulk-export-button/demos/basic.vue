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
import { BulkExportButton, DataTable, DataTableCol, List } from "@chelone/vue";
</script>

<template>
  <!-- `<BulkExportButton>` downloads the selected posts as CSV. -->
  <div class="w-full pb-28">
    <List :per-page="5">
      <SelectTwoPosts />
      <DataTable :row-click="false">
        <template #bulkActions>
          <BulkExportButton />
        </template>
        <DataTableCol source="title" />
      </DataTable>
    </List>
  </div>
</template>
