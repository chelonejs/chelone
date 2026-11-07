<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type { Identifier, LooseRecord, ResourceRecord } from "@chelone/core";
import type { DataTableRowClick } from "./data-table-context";

/**
 * Props for {@link DataTable}. A caller of `h()` with loosely typed callbacks
 * writes `h(DataTable<LooseRecord>, ...)`: `h()` resolves a generic component
 * to its constraint, `ResourceRecord`, which refuses a `(record: LooseRecord)`
 * callback.
 */
export interface DataTableProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
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
  rowClick?: DataTableRowClick<TRecord>;
  /** Allow only one expanded row at a time (also hides the expand-all button). */
  expandSingle?: boolean;
  /** Which records can expand; a rejected row gets no toggle. All can by default. */
  isRowExpandable?: (record: TRecord) => boolean;
  /** A class for a body row, computed from its record and index. */
  rowClass?: (record: TRecord, rowIndex: number) => string | false | undefined;
  /**
   * The store key of the hidden column ids; the order and the published
   * columns are kept under keys derived from it. Defaults to
   * `"<resource>.datatable"`.
   */
  storeKey?: string;
  /** Column ids hidden until a choice is stored. */
  defaultHiddenColumns?: string[];
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
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

import {
  arrangeColumns,
  type DataTableColumnInfo,
  defaultDataTableStoreKey,
  getDataTableColumnId,
} from "@chelone/core";
import {
  computed,
  ref,
  useSlots,
  type VNode,
} from "vue";
import { flattenVNodes, keyByColumnId } from "../../../lib/vnode-children";
import { useListContext } from "../../../list/list-context";
import { useDataTableColumns } from "../../../list/use-data-table-columns";
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
import Button from "../../ui/button.vue";
import {
  ColumnsOutlet,
  PassProvider,
  provideDataTableRows,
} from "./data-table-context";
import DataTableRow from "./data-table-row.vue";
import { ChevronsUpDownIcon } from "./list-icons";
import ListPagination from "./list-pagination.vue";

const props = withDefaults(
  defineProps<DataTableProps<TRecord>>(),
  { bulkActions: false, pagination: true, rowClick: "edit", expandSingle: false },
);

defineSlots<{
  default?: () => VNode[];
  /** Under an expanded row, given the row's record. */
  expand?: (props: { id: Identifier; record: TRecord; resource: string }) => VNode[];
  bulkActions?: () => VNode[];
}>();

const slots = useSlots();
const list = useListContext<TRecord>();

const hasBulkActions = computed(
  () => props.bulkActions || slots.bulkActions != null,
);

const resource = useResourceContext();
const expandEnabled = computed(() => slots.expand != null);
const expandedIds = ref<Identifier[]>([]);

const canExpand = (record: TRecord): boolean =>
  props.isRowExpandable?.(record) ?? true;

function toggleExpand(id: Identifier) {
  if (expandedIds.value.includes(id)) {
    expandedIds.value = expandedIds.value.filter((x) => x !== id);
  } else {
    expandedIds.value = props.expandSingle ? [id] : [...expandedIds.value, id];
  }
}

provideDataTableRows<TRecord>({
  rowClick: computed(() => props.rowClick),
  expandEnabled,
  expandedIds,
  toggleExpand,
  canExpand,
});

const rows = computed<TRecord[]>(() => list.data ?? []);
const isEmpty = computed(() => !list.isPending && rows.value.length === 0);

const rowId = (record: TRecord): Identifier => record.id;

const rowKey = (record: TRecord): string => String(record.id);

// Header select-all: checked when every id on the current page is selected.
const selectableIds = computed<Identifier[]>(() =>
  rows.value.map((r) => r.id),
);
const allSelected = computed(() => {
  const selected = list.selectedIds ?? [];
  return (
    selected.length > 0 &&
    selectableIds.value.length > 0 &&
    selectableIds.value.every((id) => selected.includes(id))
  );
});

// The expand-all button collapses when a row on this page is open, else opens
// every expandable row on the page. Ids of rows that left the page (paging,
// filtering, deletion) don't count.
const anyExpanded = computed(() =>
  rows.value.some((r) => expandedIds.value.includes(rowId(r))),
);

function handleToggleExpandAll() {
  expandedIds.value = anyExpanded.value
    ? []
    : rows.value.filter(canExpand).map(rowId);
}

// The columns are the default slot's nodes, flattened through the fragments
// `v-for` makes and without the comments `v-if` leaves. A node whose `source`
// and `label` props are not strings (a wrapper that does not forward them) has
// no id: it keeps its place and is always shown.
const columnProps = (node: VNode) =>
  (node.props ?? {}) as { source?: unknown; label?: unknown };

const { hidden, order, publish } = useDataTableColumns({
  storeKey: () => props.storeKey ?? defaultDataTableStoreKey(resource ?? ""),
  defaultHiddenColumns: () => props.defaultHiddenColumns,
});

const declare = (nodes: VNode[], ids: (string | undefined)[]) => {
  const defaults = props.defaultHiddenColumns ?? [];
  const seen = new Set<string>();
  const declared: DataTableColumnInfo[] = [];
  nodes.forEach((node, index) => {
    const id = ids[index];
    if (id === undefined || seen.has(id)) return;
    seen.add(id);
    const { source, label } = columnProps(node);
    declared.push({
      id,
      ...(typeof source === "string" && { source }),
      ...(typeof label === "string" && { label }),
      defaultHidden: defaults.includes(id),
    });
  });
  return declared;
};

// What the last render saw, kept for the header outlet's `report`. A slot can
// only be called while rendering, and a write to the store must not happen
// there.
let declaredColumns: DataTableColumnInfo[] = [];

// Called from a render function, so the store refs it reads are tracked there.
function arrangedColumns(): VNode[] {
  const nodes = flattenVNodes(slots.default?.() ?? []);
  const ids = nodes.map((node) => getDataTableColumnId(columnProps(node)));
  declaredColumns = declare(nodes, ids);
  const shown = arrangeColumns(ids, {
    hidden: hidden.value,
    order: order.value,
  });
  return keyByColumnId(nodes, ids, shown);
}

// The template passes `() => arrangedColumns()` to each outlet, not the function
// itself: a new function prop on every render makes an outlet re-render when
// the parent hands the table new slot content.
const reportColumns = () => publish(declaredColumns);

// The expand panel spans every shown column: the leading cells plus one per
// column child. Counted from the slot on each render, so a column that comes
// or goes after mount is picked up (as React's `Children.count` does).
const columnCount = (): number =>
  arrangedColumns().length +
  (hasBulkActions.value ? 1 : 0) +
  (expandEnabled.value ? 1 : 0);

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
            <ColumnsOutlet
              :render="() => arrangedColumns()"
              :report="reportColumns"
            />
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
              <ColumnsOutlet :render="() => arrangedColumns()" />
            </DataTableRow>
            <TableRow
              v-if="
                expandEnabled &&
                canExpand(record) &&
                expandedIds.includes(rowId(record))
              "
              data-slot="data-table-expand-panel"
            >
              <TableCell :colspan="columnCount()">
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
    <ListPagination v-if="pagination" />
    <BulkActionsToolbar v-if="hasBulkActions">
      <slot name="bulkActions" />
    </BulkActionsToolbar>
  </div>
</template>
