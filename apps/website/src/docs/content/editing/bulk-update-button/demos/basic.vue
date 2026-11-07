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
  BooleanField,
  BulkUpdateButton,
  DataTable,
  DataTableCol,
  List,
} from "@chelone/vue";
</script>

<template>
  <!-- `<BulkUpdateButton>` publishes selected posts after confirmation. -->
  <div class="w-full pb-28">
    <List :per-page="5">
      <SelectTwoPosts />
      <DataTable :row-click="false">
        <template #bulkActions>
          <BulkUpdateButton label="Publish" :data="{ published: true }" />
        </template>
        <DataTableCol source="title" />
        <DataTableCol source="published">
          <BooleanField source="published" />
        </DataTableCol>
      </DataTable>
    </List>
  </div>
</template>
