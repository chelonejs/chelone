<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link DateField}. */
export interface DateFieldProps<RecordType extends ResourceRecord = LooseRecord> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  empty?: string;
  /** BCP 47 locale(s) for `Intl.DateTimeFormat` (via `toLocale*String`). */
  locales?: Intl.LocalesArgument;
  options?: Intl.DateTimeFormatOptions;
  /** Include the time portion. Default false. */
  showTime?: boolean;
  /** Include the date portion. Default true. */
  showDate?: boolean;
  /** Value → `Date` transform; the default parses strings/numbers via `new Date`. */
  transform?: (value: SourceValue<RecordType, SourceProp<RecordType>>) => Date | undefined;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<DateField>` — displays a date value with locale-specific formatting, the
 * Vue analog of `@chelone/react`'s `fields/date-field.tsx`. Reads the value at
 * `source` off the ambient record, coerces it to a `Date`, and formats it via
 * `toLocaleString` / `toLocaleDateString` / `toLocaleTimeString` per the
 * `showDate` / `showTime` flags. A date-only string (`YYYY-MM-DD`, len ≤ 10) is
 * rendered in UTC to avoid the negative-timezone off-by-one (parity with the
 * twin). A nullish/empty value renders the `empty` fallback (or nothing).
 */

import { formatFieldDate } from "@chelone/core";
import { computed } from "vue";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

// `withDefaults` for the boolean flags: an absent Vue Boolean prop is cast to
// `false` (never `undefined`), so a bare `?? true` default would never fire —
// the default must live on the prop itself.
const props = withDefaults(defineProps<DateFieldProps<RecordType>>(), {
  showDate: true,
  showTime: false,
});

const translate = useTranslate();

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

const dateString = computed<string | null>(() =>
  formatFieldDate(value.value, {
    locales: props.locales,
    options: props.options,
    showTime: props.showTime,
    showDate: props.showDate,
    transform: props.transform,
  }),
);
</script>

<template>
  <span
    v-if="dateString == null && emptyText != null"
    data-slot="date-field"
    :class="props.class"
    >{{ emptyText }}</span
  >
  <span v-else-if="dateString != null" data-slot="date-field" :class="props.class">{{
    dateString
  }}</span>
</template>
