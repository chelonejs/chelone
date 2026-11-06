<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type { LooseRecord } from "@chelone/core";
import type { BadgeVariant } from "../../ui/badge";
import type { FieldProps } from "./field-props";

/** Props for {@link BadgeField}. */
export interface BadgeFieldProps<
  RecordType extends LooseRecord = LooseRecord,
> extends FieldProps<RecordType> {
  /** Badge variant. Default `outline` (parity with the React twin). */
  variant?: BadgeVariant;
}
</script>

<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
/**
 * `<BadgeField>` — displays a text value inside a styled `<Badge>`, the Vue port
 * of `@chelone/react`'s `fields/badge-field.tsx`. Reads the value at `source`
 * off the ambient record. Defaults to the `outline` variant. A nullish value
 * renders the (translated) `empty` string, or nothing.
 */

import { computed } from "vue";
import { Badge } from "../../ui/badge";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<BadgeFieldProps<RecordType>>();

const variant = computed(() => props.variant ?? "outline");

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

const text = computed(() => {
  const raw = value.value;
  if (raw == null) return null;
  return typeof raw === "string" ? raw : String(raw);
});

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);
</script>

<template>
  <Badge v-if="text != null" :variant="variant" :class="props.class">{{
    text
  }}</Badge>
  <span v-else-if="emptyText != null" data-slot="badge-field">{{
    emptyText
  }}</span>
</template>
