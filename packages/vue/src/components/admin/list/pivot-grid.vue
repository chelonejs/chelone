<script lang="ts" generic="TRecord extends LooseRecord = LooseRecord">
import type {
  LooseRecord,
  PivotAggregator,
  SourceProp,
} from "@chelone/core";

/** Props for {@link PivotGrid}. */
export interface PivotGridProps<TRecord extends LooseRecord = LooseRecord> {
  /** The field whose values become the rows; a dotted path reads a nested value. */
  rowSource: SourceProp<TRecord>;
  /** The field whose values become the columns. */
  columnSource: SourceProp<TRecord>;
  /** The field the aggregator reads. Unused by `count`. */
  valueSource?: SourceProp<TRecord>;
  /** Default `count`. */
  aggregator?: PivotAggregator;
  /** Prints a number in place of the locale's default text. */
  format?: (value: number) => string;
  class?: string;
}
</script>

<script
  setup
  lang="ts"
  generic="TRecord extends LooseRecord = LooseRecord"
>
/**
 * `<PivotGrid>` — the records of the ambient `<List>` as a row by column table
 * with totals. The Vue analog of `@chelone/react`'s `list/pivot-grid.tsx`. It
 * fetches nothing and sets no `perPage`, so the list must hold every record to
 * pivot. `format` returns a string where React's returns a node. The `loading`
 * and `empty` slots replace `SimpleListLoading` and `ListNoResults`.
 *
 * @example
 * <List :per-page="1000">
 *   <PivotGrid row-source="region" column-source="quarter" value-source="amount" aggregator="sum" />
 * </List>
 */

import { buildPivotTable, formatPivotValue } from "@chelone/core";
import { computed, type VNode } from "vue";
import { useLocale } from "../../../i18n/use-locale";
import { useTranslate } from "../../../i18n/use-translate";
import { useTranslateLabel } from "../../../label/use-translate-label";
import { cn } from "../../../lib/utils";
import { useListContext } from "../../../list/list-context";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import ListNoResults from "./list-no-results.vue";
import SimpleListLoading from "./simple-list-loading.vue";

const props = defineProps<PivotGridProps<TRecord>>();
defineSlots<{
  /** Rendered while the list is pending, in place of `SimpleListLoading`. */
  loading?(): VNode[];
  /** Rendered with no records, in place of `ListNoResults`. */
  empty?(): VNode[];
}>();

const list = useListContext<TRecord>();
const translate = useTranslate();
const translateLabel = useTranslateLabel();
const locale = useLocale();

const table = computed(() =>
  buildPivotTable<LooseRecord>(list.data ?? [], {
    rowSource: props.rowSource,
    columnSource: props.columnSource,
    valueSource: props.valueSource,
    aggregator: props.aggregator,
  }),
);

const noValue = computed(() =>
  translate("chelone.pivot_grid.no_value", { _: "(none)" }),
);
const total = computed(() =>
  translate("chelone.pivot_grid.total", { _: "Total" }),
);
const keyText = (key: string) => (key === "" ? noValue.value : key);
const print = (value: number | null | undefined) =>
  value == null
    ? ""
    : props.format
      ? props.format(value)
      : formatPivotValue(value, locale.value);
</script>

<template>
  <slot v-if="list.isPending" name="loading">
    <SimpleListLoading :class="props.class" />
  </slot>
  <slot v-else-if="!list.data || list.data.length === 0" name="empty">
    <ListNoResults />
  </slot>
  <div
    v-else
    data-slot="pivot-grid"
    :class="cn('relative w-full overflow-x-auto', props.class)"
  >
    <table class="w-full caption-bottom text-sm">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{{
            translateLabel({ source: props.rowSource })
          }}</TableHead>
          <TableHead v-for="key in table.columnKeys" :key="key" scope="col">{{
            keyText(key)
          }}</TableHead>
          <TableHead scope="col">{{ total }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="(rowKey, row) in table.rowKeys" :key="rowKey">
          <TableHead scope="row">{{ keyText(rowKey) }}</TableHead>
          <TableCell
            v-for="(value, column) in table.cells[row]"
            :key="table.columnKeys[column]"
            data-slot="pivot-grid-cell"
            :data-empty="value === null ? '' : undefined"
            >{{ print(value) }}</TableCell
          >
          <TableCell data-slot="pivot-grid-total">{{
            print(table.rowTotals[row])
          }}</TableCell>
        </TableRow>
        <TableRow>
          <TableHead scope="row">{{ total }}</TableHead>
          <TableCell
            v-for="(value, column) in table.columnTotals"
            :key="table.columnKeys[column]"
            data-slot="pivot-grid-total"
            >{{ print(value) }}</TableCell
          >
          <TableCell data-slot="pivot-grid-total">{{
            print(table.grandTotal)
          }}</TableCell>
        </TableRow>
      </TableBody>
    </table>
  </div>
</template>
