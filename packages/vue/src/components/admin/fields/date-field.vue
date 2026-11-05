<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type { LooseRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link DateField}. */
export interface DateFieldProps<RecordType extends LooseRecord = LooseRecord> {
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

<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
/**
 * `<DateField>` — displays a date value with locale-specific formatting, the
 * Vue analog of `@chelone/react`'s `fields/date-field.tsx`. Reads the value at
 * `source` off the ambient record, coerces it to a `Date`, and formats it via
 * `toLocaleString` / `toLocaleDateString` / `toLocaleTimeString` per the
 * `showDate` / `showTime` flags. A date-only string (`YYYY-MM-DD`, len ≤ 10) is
 * rendered in UTC to avoid the negative-timezone off-by-one (parity with the
 * twin). A nullish/empty value renders the `empty` fallback (or nothing).
 */

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

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

/** Coerce to a `Date` (mirrors the twin's `defaultTransform`). */
function defaultTransform(v: unknown): Date | undefined {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return undefined;
}

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

const dateString = computed<string | null>(() => {
  if (!props.showTime && !props.showDate) {
    throw new Error(
      "<DateField> cannot have showTime and showDate false at the same time",
    );
  }

  const raw = value.value;
  if (raw == null || raw === "") return null;

  const transform = props.transform ?? defaultTransform;
  const date = transform(raw);
  if (!date) return "";

  if (props.showTime && props.showDate) {
    return date.toLocaleString(props.locales, props.options);
  }
  if (props.showDate) {
    // A date-only string (no time/zone) is forced to UTC so people in negative
    // time zones don't see the previous day.
    const dateOptions =
      props.options ??
      (typeof raw === "string" && raw.length <= 10
        ? { timeZone: "UTC" }
        : undefined);
    return date.toLocaleDateString(props.locales, dateOptions);
  }
  return date.toLocaleTimeString(props.locales, props.options);
});
</script>

<template>
  <span v-if="dateString != null" data-slot="date-field" :class="props.class">{{
    dateString
  }}</span>
  <span
    v-else-if="emptyText != null"
    data-slot="date-field"
    :class="props.class"
    >{{ emptyText }}</span
  >
</template>
