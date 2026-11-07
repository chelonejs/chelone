<script lang="ts">
/**
 * Selects the whole first page so the button the page lacks appears. The
 * selection is made by a child of `<List>`, where `useListContext` resolves.
 */
import { useListContext } from "@chelone/vue";
import { defineComponent, onMounted } from "vue";

const SelectFirstPage = defineComponent({
  setup() {
    const list = useListContext();
    onMounted(() => list.select([1, 2, 3, 4, 5]));
    return () => null;
  },
});
</script>

<script setup lang="ts">
import {
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  List,
  SelectAllButton,
} from "@chelone/vue";
</script>

<template>
  <!-- `<SelectAllButton>` appears once every row of the page is checked, and checks the other seven posts on click. The table's own checkboxes and the "5 items selected" bar make the selection visible. -->
  <div class="w-full pb-28">
    <List :per-page="5">
      <template #actions>
        <SelectAllButton />
      </template>
      <SelectFirstPage />
      <DataTable :row-click="false" bulk-actions>
        <DataTableCol source="title" />
        <DataTableNumberCol source="views" />
      </DataTable>
    </List>
  </div>
</template>
