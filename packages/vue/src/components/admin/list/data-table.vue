<script setup lang="ts">
/**
 * `<DataTable>` — a table over the ambient list surface, the Vue analog of
 * `@chelone/react`'s `list/data-table.tsx`. Reads `useListContext` (published by
 * `<List>`), renders a header row from the `<DataTableCol>` children (in the
 * `"header"` pass) and one `<DataTableRow>` per record (each providing the row
 * record + the `"data"` pass).
 *
 * Selection + pagination (V3-b): when bulk actions are enabled — the
 * `:bulk-actions` prop is set OR a `#bulkActions` slot is passed — a leading
 * select-all/select-row checkbox column is added and a `<BulkActionsToolbar>`
 * (carrying the `#bulkActions` slot) is rendered below the table; it surfaces on
 * selection. `<ListPagination>` renders below the table by default (opt out with
 * `:pagination="false"`). Both read the SAME ambient `useListContext`.
 *
 * Column API (mirrors React's `DataTable.Col`): pass `<DataTableCol>` children.
 * The named export `DataTableCol` is the Vue equivalent of `DataTable.Col`.
 */

import type { Identifier, LooseRecord } from "@chelone/core";
import { computed, useSlots } from "vue";
import { useListContext } from "../../../list/list-context";
import { Checkbox } from "../../ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import BulkActionsToolbar from "./bulk-actions-toolbar.vue";
import { PassProvider } from "./data-table-context";
import DataTableRow from "./data-table-row.vue";
import ListPagination from "./list-pagination.vue";

const props = withDefaults(
  defineProps<{
    class?: string;
    /** Enable row selection + the bulk-actions toolbar (also on if a `#bulkActions` slot is passed). */
    bulkActions?: boolean;
    /** Render `<ListPagination>` below the table (default true). */
    pagination?: boolean;
  }>(),
  { bulkActions: false, pagination: true },
);

const slots = useSlots();
const list = useListContext();

const hasBulkActions = computed(
  () => props.bulkActions || slots.bulkActions != null,
);

const rows = computed<LooseRecord[]>(() => (list.data ?? []) as LooseRecord[]);
const isEmpty = computed(() => !list.isPending && rows.value.length === 0);

const rowKey = (record: LooseRecord): string =>
  String((record as { id?: unknown }).id);

// Header select-all: checked when every id on the current page is selected.
const selectableIds = computed<Identifier[]>(() =>
  rows.value.map((r) => (r as { id: Identifier }).id),
);
const allSelected = computed(() => {
  const selected = list.selectedIds ?? [];
  return (
    selected.length > 0 &&
    selectableIds.value.length > 0 &&
    selectableIds.value.every((id) => selected.includes(id))
  );
});

function handleToggleSelectAll(checked: boolean) {
  const selected = list.selectedIds ?? [];
  if (checked) {
    list.select(
      selected.concat(selectableIds.value.filter((id) => !selected.includes(id))),
    );
  } else {
    list.select(selected.filter((id) => !selectableIds.value.includes(id)));
  }
}
</script>

<template>
  <div :class="props.class" data-slot="data-table">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead v-if="hasBulkActions" class="w-8">
            <Checkbox
              :model-value="allSelected"
              aria-label="Select all rows on this page"
              @update:model-value="handleToggleSelectAll"
            />
          </TableHead>
          <PassProvider pass="header">
            <slot />
          </PassProvider>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="list.isPending">
          <TableCell data-slot="data-table-loading">Loading…</TableCell>
        </TableRow>
        <TableRow v-else-if="isEmpty">
          <TableCell data-slot="data-table-empty">No results found.</TableCell>
        </TableRow>
        <template v-else>
          <DataTableRow
            v-for="record in rows"
            :key="rowKey(record)"
            :record="record"
            :has-bulk-actions="hasBulkActions"
          >
            <slot />
          </DataTableRow>
        </template>
      </TableBody>
    </Table>
    <ListPagination v-if="pagination" class="mt-2" />
    <BulkActionsToolbar v-if="hasBulkActions">
      <slot name="bulkActions" />
    </BulkActionsToolbar>
  </div>
</template>
