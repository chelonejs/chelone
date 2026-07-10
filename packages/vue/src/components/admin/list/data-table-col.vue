<script setup lang="ts">
/**
 * `<DataTableCol>` — one column of a `<DataTable>`, the Vue analog of
 * `@chelone/react`'s `DataTable.Col`. It dispatches on the ambient render pass
 * (see `data-table-context.ts`): in the HEADER pass it renders a `<th>` with the
 * column label; in the DATA pass it renders a `<td>` whose content is the
 * default slot (a field component reading the row's record context) or — with no
 * slot — the raw value at `source` off the record.
 */

import { computed } from "vue";
import { useFieldValue } from "../../../record/use-field-value";
import { TableCell, TableHead } from "../../ui/table";
import { humanizeSource } from "../inputs/label-text";
import { useDataTablePass } from "./data-table-context";

const props = defineProps<{
  source?: string;
  label?: string;
  class?: string;
}>();

const pass = useDataTablePass();
// Called unconditionally (used only in the data pass with no slot). Reads the
// ambient row record; harmless in the header pass where no record is provided.
const value = useFieldValue({ source: props.source ?? "" });

const headerText = computed(
  () => props.label ?? (props.source ? humanizeSource(props.source) : ""),
);
const cellText = computed(() => {
  const raw = value.value;
  return raw == null ? "" : typeof raw === "string" ? raw : String(raw);
});
</script>

<template>
  <TableHead v-if="pass === 'header'" :class="props.class">
    {{ headerText }}
  </TableHead>
  <TableCell v-else :class="props.class">
    <slot>{{ cellText }}</slot>
  </TableCell>
</template>
