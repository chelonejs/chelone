<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link NumberField}. */
export interface NumberFieldProps<RecordType extends ResourceRecord = LooseRecord> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  empty?: string;
  /** BCP 47 locale(s) for `Intl.NumberFormat` (via `toLocaleString`). */
  locales?: string | string[];
  /** `Intl.NumberFormatOptions` (currency, percent, min/max fraction digits…). */
  options?: Intl.NumberFormatOptions;
  /** Pre-format transform; the default coerces a numeric string to a number. */
  transform?: (
    value: SourceValue<RecordType, SourceProp<RecordType>>,
  ) => number | string | null | undefined;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<NumberField>` — displays a numeric value with locale-specific formatting,
 * the Vue analog of `@chelone/react`'s `fields/number-field.tsx`. Reads the
 * value at `source` off the ambient record and formats it via
 * `Number.prototype.toLocaleString(locales, options)` (currencies, percentages,
 * fraction digits). A nullish value renders the `empty` fallback (or nothing).
 */

import { formatFieldNumber } from "@chelone/core";
import { computed } from "vue";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<NumberFieldProps<RecordType>>();

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

const formatted = computed<string | null>(() =>
  formatFieldNumber(value.value, {
    locales: props.locales,
    options: props.options,
    transform: props.transform,
  }),
);
</script>

<template>
  <span v-if="formatted != null" data-slot="number-field" :class="props.class">{{
    formatted
  }}</span>
  <span
    v-else-if="emptyText != null"
    data-slot="number-field"
    :class="props.class"
    >{{ emptyText }}</span
  >
</template>
