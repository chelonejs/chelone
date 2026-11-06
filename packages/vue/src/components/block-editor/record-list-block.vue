<script setup lang="ts">
/** The view of the record list block: the first rows of a resource, as a table of up to three columns. */

import { formatDataBlockValue, pickDataBlockFields, readDataBlockValue } from "@chelone/core";
import { computed } from "vue";
import { useGetList } from "../../data/queries";
import { useTranslate } from "../../i18n/use-translate";
import { useTranslateLabel } from "../../label/use-translate-label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import DataBlockState from "./data-block-state.vue";
import { useDataBlockGate } from "./data-block-parts";
import type { RecordListAttrs } from "./data-blocks";

const props = defineProps<{
  attrs: RecordListAttrs;
  mode: "edit" | "read";
  selected?: boolean;
  updateAttrs?: (attrs: Partial<RecordListAttrs>) => void;
}>();

// The view is remounted when the resource changes, so it reads it once.
const { resource } = props.attrs;
const translate = useTranslate();
const translateLabel = useTranslateLabel();
const configured = resource !== "";
const { data, isError } = useGetList(
  resource,
  () => ({ pagination: { page: 1, perPage: props.attrs.perPage } }),
  { enabled: configured },
);
const gate = useDataBlockGate(
  "recordList",
  { configured, isError },
  { empty: "Choose a resource", error: "The records could not be loaded" },
);
const rows = computed(() => data.value?.data ?? []);
const columns = computed(() => {
  const [first] = rows.value;
  return first === undefined
    ? []
    : pickDataBlockFields(first, props.attrs.fields, 3);
});
</script>

<template>
  <DataBlockState v-if="gate" :kind="gate.kind">{{ gate.message }}</DataBlockState>
  <!-- Configured and not failed, so the read is still on its way. -->
  <DataBlockState v-else-if="data === undefined" kind="loading" />
  <DataBlockState v-else-if="rows.length === 0" kind="empty">
    {{ translate("chelone.block_editor.recordList.no_records", { _: "No records" }) }}
  </DataBlockState>
  <Table v-else class="my-2">
    <TableHeader>
      <TableRow>
        <TableHead v-for="column in columns" :key="column">
          {{ translateLabel({ source: column, resource }) }}
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow v-for="row in rows" :key="String(row.id)">
        <TableCell v-for="column in columns" :key="column">
          {{ formatDataBlockValue(readDataBlockValue(row, column)) }}
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
