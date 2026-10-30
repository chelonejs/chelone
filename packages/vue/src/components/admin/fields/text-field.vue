<script lang="ts">
/** Props for {@link TextField}. */
export interface TextFieldProps {
  source: string;
  record?: LooseRecord;
  defaultValue?: unknown;
  empty?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TextField>` — displays a text value from a record field, the Vue analog of
 * `@chelone/react`'s `fields/text-field.tsx`. Reads the value at `source` off
 * the ambient (or overridden) record via `useFieldValue` and renders it in a
 * `<span>`. A nullish value renders the `empty` fallback (or nothing).
 */

import type { LooseRecord } from "@chelone/core";
import { computed } from "vue";
import { useFieldValue } from "../../../record/use-field-value";

const props = defineProps<TextFieldProps>();

const value = useFieldValue({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const text = computed(() => {
  const raw = value.value;
  if (raw == null) return null;
  return typeof raw === "string" ? raw : String(raw);
});
</script>

<template>
  <span v-if="text != null" data-slot="text-field">{{ text }}</span>
  <span v-else-if="empty" data-slot="text-field">{{ empty }}</span>
</template>
