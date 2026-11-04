<script lang="ts">
import type { SourceProp } from "@chelone/core";
import type { DataTableColProps } from "./data-table-col.vue";

/** Props for {@link DataTableNumberCol}. */
export interface DataTableNumberColProps
  extends Omit<DataTableColProps, "source"> {
  source: SourceProp;
  /** BCP 47 locale(s) for `Intl.NumberFormat`. */
  locales?: string | string[];
  /** `Intl.NumberFormatOptions` (currency, percent, fraction digits…). */
  options?: Intl.NumberFormatOptions;
}
</script>

<script setup lang="ts">
/**
 * `<DataTableNumberCol>` — a right-aligned, number-formatted column, the Vue
 * analog of `@chelone/react`'s `DataTable.NumberCol`: a `<DataTableCol>` whose
 * cell is a `<NumberField>`.
 */

import { cn } from "../../../lib/utils";
import NumberField from "../fields/number-field.vue";
import DataTableCol from "./data-table-col.vue";

const props = defineProps<DataTableNumberColProps>();
</script>

<template>
  <DataTableCol
    :source="source"
    :label="label"
    :class="props.class"
    :disable-sort="disableSort"
    :sort-by-order="sortByOrder"
    :header-class="cn('text-right', headerClass)"
    :cell-class="cn('text-right', cellClass)"
    :conditional-class="conditionalClass"
  >
    <NumberField :source="source" :locales="locales" :options="options" />
  </DataTableCol>
</template>
