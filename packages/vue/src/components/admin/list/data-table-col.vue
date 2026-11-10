<script lang="ts">
import type { LooseRecord, SourceProp } from "@chelone/core";

/** Props for {@link DataTableCol}. */
export interface DataTableColProps {
  source?: SourceProp;
  label?: string;
  /** Applied to both the header and the body cells. */
  class?: string;
  /** Hide the sort button on the header. A column with no `source` never sorts. */
  disableSort?: boolean;
  /** The order the first click sorts by (default `"ASC"`). */
  sortByOrder?: "ASC" | "DESC";
  /** Extra class for the header `<th>` only. */
  headerClass?: string;
  /** Extra class for the body `<td>`s only. */
  cellClass?: string;
  /** Extra class for a body `<td>`, computed from its row record. */
  conditionalClass?: (record: LooseRecord) => string | false | undefined;
}
</script>

<script setup lang="ts">
/**
 * `<DataTableCol>` — one column of a `<DataTable>`, the Vue analog of
 * `@chelone/react`'s `DataTable.Col`. It dispatches on the ambient render pass
 * (see `data-table-context.ts`): in the HEADER pass it renders a `<th>` whose
 * label is a sort button (unless the column has no `source` or sets
 * `disableSort`); in the DATA pass it renders a `<td>` whose content is the
 * default slot (called with `{ record }`, the Vue form of React's `render` prop)
 * or — with no slot — the raw value at `source` off the record.
 */

import { getAtPath, type LooseSortPayload } from "@chelone/core";
import { computed, inject } from "vue";
import { cn } from "../../../lib/utils";
import { useListContext } from "../../../list/list-context";
import { RecordContextKey } from "../../../record/record-context";
import Button from "../../ui/button.vue";
import { TableCell, TableHead } from "../../ui/table";
import { ChevronDownIcon } from "../buttons/icons";
import FieldLabelText from "../common/field-label-text.vue";
import { useDataTablePass } from "./data-table-context";

const props = defineProps<DataTableColProps>();

const pass = useDataTablePass();
const recordRef = inject(RecordContextKey, null);
const record = computed(() => recordRef?.value);
// Read the source value off the ambient row record (core's `getAtPath`, the read
// `useFieldValue` makes). A column with no `source` reads nothing.
const value = computed(() =>
  props.source === undefined
    ? undefined
    : getAtPath(record.value, props.source),
);

// `<DataTableCol>` renders in the header pass inside `<List>`; the data pass
// can also be reached without one, so only the header reads the list.
const list = pass === "header" ? useListContext() : null;

const primarySort = computed<LooseSortPayload | undefined>(
  () => list?.sort[0],
);
const isSorted = computed(
  () => !!props.source && primarySort.value?.field === props.source,
);
const isSortable = computed(() => !props.disableSort && !!props.source);
const ariaSort = computed(() => {
  if (!isSorted.value) return undefined;
  return primarySort.value?.order === "ASC" ? "ascending" : "descending";
});

function onSort() {
  if (!list || !props.source) return;
  const order =
    isSorted.value && primarySort.value
      ? primarySort.value.order === "ASC"
        ? "DESC"
        : "ASC"
      : (props.sortByOrder ?? "ASC");
  list.setSort({ field: props.source, order });
}

const cellText = computed(() => {
  const raw = value.value;
  return raw == null ? "" : typeof raw === "string" ? raw : String(raw);
});
const cellClasses = computed(() =>
  cn(
    props.class,
    props.cellClass,
    record.value && props.conditionalClass?.(record.value),
  ),
);
</script>

<template>
  <TableHead
    v-if="pass === 'header'"
    :class="cn(props.class, headerClass)"
    :aria-sort="ariaSort"
  >
    <Button
      v-if="isSortable"
      variant="ghost"
      size="sm"
      class="-mx-2 h-8"
      :data-field="source"
      @click="onSort"
    >
      <FieldLabelText :label="label" :source="source" />
      <ChevronDownIcon
        v-if="isSorted"
        :class="primarySort?.order === 'ASC' ? 'rotate-180' : ''"
      />
    </Button>
    <!-- text-xs: the sortable header's ghost Button is text-xs, so a header with
         no sort button reads the same size beside it. -->
    <span v-else class="text-xs">
      <FieldLabelText :label="label" :source="source" />
    </span>
  </TableHead>
  <TableCell v-else :class="cellClasses">
    <slot :record="record">{{ cellText }}</slot>
  </TableCell>
</template>
