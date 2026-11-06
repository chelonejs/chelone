<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type { LooseRecord } from "@chelone/core";
import type { BadgeVariant } from "../../ui/badge";
import type { FieldProps } from "./field-props";

/** Props for {@link TextArrayField}. */
export interface TextArrayFieldProps<
  RecordType extends LooseRecord = LooseRecord,
> extends FieldProps<RecordType> {
  /** Badge variant. Default `outline` (parity with the React twin). */
  variant?: BadgeVariant;
}
</script>

<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
/**
 * `<TextArrayField>` — renders an array of scalar values as a horizontal list of
 * `<Badge>` chips, the Vue port of `@chelone/react`'s `fields/text-array-field.tsx`.
 * Reads the array at `source` off the ambient record; a missing/empty array
 * renders the (translated) `empty` string, or nothing.
 */

import { computed } from "vue";
import { Badge } from "../../ui/badge";
import { cn } from "../../../lib/utils";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<TextArrayFieldProps<RecordType>>();

const variant = computed(() => props.variant ?? "outline");

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

const items = computed<unknown[]>(() =>
  Array.isArray(value.value) ? value.value : [],
);

const isEmpty = computed(() => items.value.length === 0);

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

/** Stringify a non-string item for display (parity with the React twin). */
function itemText(item: unknown): string | null | undefined {
  return item == null ? item : String(item);
}
</script>

<template>
  <span
    v-if="isEmpty && emptyText != null"
    :class="cn('text-muted-foreground', props.class)"
    data-slot="text-array-field"
    >{{ emptyText }}</span
  >
  <div
    v-else-if="!isEmpty"
    :class="cn('flex flex-wrap gap-1', props.class)"
    data-slot="text-array-field"
  >
    <Badge
      v-for="(item, index) in items"
      :key="`${String(item)}-${index}`"
      :variant="variant"
      >{{ itemText(item) }}</Badge
    >
  </div>
</template>
