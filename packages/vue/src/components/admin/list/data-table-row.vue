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
 */

import type { LooseRecord } from "@chelone/core";
import { provide, ref, watch } from "vue";
import { useRouterAdapterOptional } from "../../../router/adapter";
import { useCreatePath } from "../../../router/nav-composables";
import { RecordContextKey, type RecordValue } from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import { TableRow } from "../../ui/table";
import { DataTablePassKey } from "./data-table-context";

const props = defineProps<{ record: LooseRecord }>();

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

// Row-click → edit page, only when a router + resource are present.
const adapter = useRouterAdapterOptional();
const resource = useResourceContext();
const navigate = adapter?.useNavigate();
const createPath = adapter ? useCreatePath() : undefined;

function onRowClick() {
  if (!navigate || !createPath || !resource) return;
  const id = (props.record as { id?: unknown }).id;
  if (id == null) return;
  navigate(createPath({ type: "edit", resource, id: id as string | number }));
}
</script>

<template>
  <TableRow
    :class="adapter ? 'cursor-pointer' : ''"
    data-slot="data-table-row"
    @click="onRowClick"
  >
    <slot />
  </TableRow>
</template>
