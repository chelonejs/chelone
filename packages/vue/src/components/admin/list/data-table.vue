<script lang="ts">
import type { Identifier, LooseRecord } from "@chelone/core";
import type { DataTableRowClick } from "./data-table-context";

/** Props for {@link DataTable}. */
export interface DataTableProps {
  class?: string;
  /** Enable row selection + the bulk-actions toolbar (also on if a `#bulkActions` slot is passed). */
  bulkActions?: boolean;
  /** Render `<ListPagination>` below the table (default true). */
  pagination?: boolean;
  /**
   * What a row click does: `"edit"` (default), `"show"`, `"expand"`,
   * `"toggleSelection"`, `false` (inert), or a function of `(record, id)`
   * returning one of those or any other link type (`false` = do nothing).
   */
  rowClick?: DataTableRowClick;
  /** Allow only one expanded row at a time (also hides the expand-all button). */
  expandSingle?: boolean;
  /** Which records can expand; a rejected row gets no toggle. All can by default. */
  isRowExpandable?: (record: LooseRecord) => boolean;
  /** A class for a body row, computed from its record and index. */
  rowClass?: (record: LooseRecord, rowIndex: number) => string | false | undefined;
}
</script>

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

import { computed, onMounted, onUpdated, provide, ref, useSlots } from "vue";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import Checkbox from "../../ui/checkbox.vue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import BulkActionsToolbar from "./bulk-actions-toolbar.vue";
import { Button } from "../../ui";
import {
  DataTableRowsKey,
  PassProvider,
} from "./data-table-context";
import DataTableRow from "./data-table-row.vue";
import { ChevronsUpDownIcon } from "./list-icons";
import ListPagination from "./list-pagination.vue";

const props = withDefaults(
  defineProps<DataTableProps>(),
  { bulkActions: false, pagination: true, rowClick: "edit", expandSingle: false },
);

const slots = useSlots();
const list = useListContext();

const hasBulkActions = computed(
  () => props.bulkActions || slots.bulkActions != null,
);

const resource = useResourceContext();
const expandEnabled = computed(() => slots.expand != null);
const expandedIds = ref<Identifier[]>([]);

const canExpand = (record: LooseRecord): boolean =>
  props.isRowExpandable?.(record) ?? true;

function toggleExpand(id: Identifier) {
  if (expandedIds.value.includes(id)) {
    expandedIds.value = expandedIds.value.filter((x) => x !== id);
  } else {
    expandedIds.value = props.expandSingle ? [id] : [...expandedIds.value, id];
  }
}

provide(DataTableRowsKey, {
  rowClick: computed(() => props.rowClick),
  expandEnabled,
  expandedIds,
  toggleExpand,
  canExpand,
});

const rows = computed<LooseRecord[]>(() => (list.data ?? []) as LooseRecord[]);
const isEmpty = computed(() => !list.isPending && rows.value.length === 0);

const rowId = (record: LooseRecord): Identifier =>
  (record as { id: Identifier }).id;

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

// The expand-all button collapses when anything is open, else opens every
// expandable row on the page.
const anyExpanded = computed(() => expandedIds.value.length > 0);

function handleToggleExpandAll() {
  expandedIds.value = anyExpanded.value
    ? []
    : rows.value.filter(canExpand).map(rowId);
}

// The expand panel spans every column; the columns are the header's cells.
const headerRow = ref<{ $el: HTMLElement } | null>(null);
const columnCount = ref(1);
function measureColumns() {
  columnCount.value = headerRow.value?.$el.children.length || 1;
}
onMounted(measureColumns);
onUpdated(measureColumns);

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
        <TableRow ref="headerRow">
          <TableHead v-if="hasBulkActions" class="w-8">
            <Checkbox
              :model-value="allSelected"
              aria-label="Select all rows on this page"
              @update:model-value="handleToggleSelectAll"
            />
          </TableHead>
          <TableHead v-if="expandEnabled" class="w-8">
            <Button
              v-if="!expandSingle"
              variant="ghost"
              size="icon"
              class="size-7"
              :aria-label="anyExpanded ? 'Collapse all rows' : 'Expand all rows'"
              @click.stop="handleToggleExpandAll"
            >
              <ChevronsUpDownIcon />
            </Button>
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
          <template v-for="(record, index) in rows" :key="rowKey(record)">
            <DataTableRow
              :record="record"
              :has-bulk-actions="hasBulkActions"
              :class="rowClass?.(record, index) || undefined"
            >
              <slot />
            </DataTableRow>
            <TableRow
              v-if="
                expandEnabled &&
                canExpand(record) &&
                expandedIds.includes(rowId(record))
              "
              data-slot="data-table-expand-panel"
            >
              <TableCell :colspan="columnCount">
                <slot
                  name="expand"
                  :id="rowId(record)"
                  :record="record"
                  :resource="resource ?? ''"
                />
              </TableCell>
            </TableRow>
          </template>
        </template>
      </TableBody>
    </Table>
    <ListPagination v-if="pagination" class="mt-2" />
    <BulkActionsToolbar v-if="hasBulkActions">
      <slot name="bulkActions" />
    </BulkActionsToolbar>
  </div>
</template>
