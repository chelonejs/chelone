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
  BooleanInput,
  BulkEditDrawer,
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  List,
  NumberInput,
} from "@chelone/vue";
</script>

<template>
  <!-- `<BulkEditDrawer>` sets the views or the published flag of two selected posts from a side sheet, sending only the fields you touch. The sheet opens on click. -->
  <div class="w-full pb-28">
    <List :per-page="5">
      <SelectTwoPosts />
      <DataTable :row-click="false">
        <template #bulkActions>
          <BulkEditDrawer label="Edit posts" title="Edit selected posts">
            <NumberInput source="views" />
            <BooleanInput source="published" />
          </BulkEditDrawer>
        </template>
        <DataTableCol source="title" />
        <DataTableNumberCol source="views" />
      </DataTable>
    </List>
  </div>
</template>
