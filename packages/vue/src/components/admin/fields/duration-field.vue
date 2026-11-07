<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link DurationField}. */
export interface DurationFieldProps<RecordType extends ResourceRecord = LooseRecord> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  empty?: string;
  /** 'compact' renders `2h 30m`; 'relative' renders `2 hours 30 minutes`. */
  displayFormat?: "compact" | "relative";
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<DurationField>` — displays an ISO-8601 duration string as a compact
 * ("2h 30m") or relative ("2 hours 30 minutes") human-readable value. The Vue
 * analog of `@chelone/react`'s `fields/duration-field.tsx`, reusing the shared
 * `duration-utils` parse/format helpers. A nullish/empty value renders the
 * `empty` fallback (or nothing); an unparseable string renders nothing.
 */

import { computed } from "vue";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";
import {
  compactDuration,
  parseIsoDuration,
  relativeDuration,
} from "../inputs/duration-utils";

const props = defineProps<DurationFieldProps<RecordType>>();

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

const isEmptyValue = computed(() => value.value == null || value.value === "");

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

const text = computed<string | null>(() => {
  if (isEmptyValue.value) return null;
  const parsed = parseIsoDuration(String(value.value));
  if (!parsed) return null;
  return props.displayFormat === "relative"
    ? relativeDuration(parsed)
    : compactDuration(parsed);
});
</script>

<template>
  <span v-if="text != null" data-slot="duration-field" :class="props.class">{{
    text
  }}</span>
  <span
    v-else-if="isEmptyValue && emptyText != null"
    data-slot="duration-field"
    :class="props.class"
    >{{ emptyText }}</span
  >
</template>
