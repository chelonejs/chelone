<script setup lang="ts">
/**
 * `<DataTableRow>` — one body row of a `<DataTable>`, the Vue analog of
 * `@chelone/react`'s `DataTableRow`. It provides the row's record (so slotted
 * field/`<DataTableCol>` children resolve it via `RecordContext`) and stamps the
 * `"data"` render pass, then renders the columns inside a `<TableRow>`.
 *
 * Row-click navigation to the record's edit page is wired when a router adapter
 * is present (mirrors the React twin's `rowClick="edit"` default); without one
 * the row is inert (unit tests, no router).
 *
 * Selection (V3-b): when `hasBulkActions` is set the row renders a leading
 * checkbox bound to the ambient list selection (`selectedIds` / `toggleItem`);
 * toggling it stops propagation so it never triggers the row-click navigation.
 */

import type { Identifier, LooseRecord } from "@chelone/core";
import { computed, inject, provide, ref, watch } from "vue";
import { useListContext } from "../../../list/list-context";
import {
  RecordContextKey,
  type RecordValue,
} from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import { useRouterAdapterOptional } from "../../../router/adapter";
import { useCreatePath } from "../../../router/nav-composables";
import Button from "../../ui/button.vue";
import Checkbox from "../../ui/checkbox.vue";
import { TableCell, TableRow } from "../../ui/table";
import { DataTablePassKey, DataTableRowsKey } from "./data-table-context";
import { ChevronDownIcon } from "../buttons/icons";
import { ChevronRightIcon } from "./list-icons";

const props = defineProps<{
  record: LooseRecord;
  hasBulkActions?: boolean;
}>();

// Publish the row record (reactive ref) + the data render pass to the columns.
const recordRef = ref<RecordValue>(props.record);
watch(
  () => props.record,
  (next) => {
    recordRef.value = next;
  },
);
provide(RecordContextKey, recordRef);
provide(DataTablePassKey, "data");

const list = useListContext();
const recordId = computed<Identifier>(() => props.record.id);
const isSelected = computed(
  () => list.selectedIds?.includes(recordId.value) ?? false,
);

function onToggleSelect() {
  if (recordId.value == null) return;
  list.toggleItem(recordId.value);
}

// Row-click: a link type needs a router + resource; `expand` and
// `toggleSelection` act on the table's own state.
const adapter = useRouterAdapterOptional();
const resource = useResourceContext();
const navigate = adapter?.useNavigate();
const createPath = adapter ? useCreatePath() : undefined;
const rows = inject(DataTableRowsKey, null);

const link = computed(() => {
  const rowClick = rows?.rowClick.value ?? "edit";
  return typeof rowClick === "function"
    ? rowClick(props.record, recordId.value)
    : rowClick;
});
const expandable = computed(
  () => !!rows?.expandEnabled.value && rows.canExpand(props.record),
);
const isExpanded = computed(
  () => rows?.expandedIds.value.includes(recordId.value) ?? false,
);
const clickable = computed(() => {
  if (link.value === false) return false;
  if (link.value === "expand") return expandable.value;
  if (link.value === "toggleSelection") return true;
  return !!adapter;
});

function onRowClick() {
  if (!clickable.value || recordId.value == null) return;
  if (link.value === "expand") return rows?.toggleExpand(recordId.value);
  if (link.value === "toggleSelection") return onToggleSelect();
  if (!navigate || !createPath || !resource || !link.value) return;
  navigate(createPath({ type: link.value, resource, id: recordId.value }));
}

function onToggleExpand() {
  if (recordId.value != null) rows?.toggleExpand(recordId.value);
}
</script>

<template>
  <TableRow
    :class="clickable ? 'cursor-pointer' : ''"
    data-slot="data-table-row"
    @click="onRowClick"
  >
    <TableCell v-if="hasBulkActions" class="w-8" @click.stop>
      <Checkbox
        :model-value="isSelected"
        aria-label="Select row"
        @update:model-value="onToggleSelect"
      />
    </TableCell>
    <TableCell v-if="rows?.expandEnabled.value" class="w-8 p-0">
      <Button
        v-if="expandable"
        variant="ghost"
        size="icon"
        class="size-7"
        :aria-label="isExpanded ? 'Collapse row' : 'Expand row'"
        :aria-expanded="isExpanded"
        @click.stop="onToggleExpand"
      >
        <ChevronDownIcon v-if="isExpanded" />
        <ChevronRightIcon v-else />
      </Button>
    </TableCell>
    <slot />
  </TableRow>
</template>
