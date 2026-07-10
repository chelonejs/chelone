<script setup lang="ts">
/**
 * `<DataTable>` — a table over the ambient list surface, the Vue analog of
 * `@chelone/react`'s `list/data-table.tsx`. Reads `useListContext` (published by
 * `<List>`), renders a header row from the `<DataTableCol>` children (in the
 * `"header"` pass) and one `<DataTableRow>` per record (each providing the row
 * record + the `"data"` pass). Loading and empty states are minimal (the
 * skeleton / bulk-selection surface is a later wave).
 *
 * Column API (mirrors React's `DataTable.Col`): pass `<DataTableCol>` children.
 * The named export `DataTableCol` is the Vue equivalent of `DataTable.Col`.
 */

import type { LooseRecord } from "@chelone/core";
import { computed } from "vue";
import { useListContext } from "../../../list/list-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { PassProvider } from "./data-table-context";
import DataTableRow from "./data-table-row.vue";

const props = defineProps<{ class?: string }>();

const list = useListContext();

const rows = computed<LooseRecord[]>(() => (list.data ?? []) as LooseRecord[]);
const isEmpty = computed(() => !list.isPending && rows.value.length === 0);

const rowKey = (record: LooseRecord): string =>
  String((record as { id?: unknown }).id);
</script>

<template>
  <div :class="props.class" data-slot="data-table">
    <Table>
      <TableHeader>
        <TableRow>
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
          >
            <slot />
          </DataTableRow>
        </template>
      </TableBody>
    </Table>
  </div>
</template>
