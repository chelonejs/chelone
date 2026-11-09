<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link TextField}. */
export interface TextFieldProps<RecordType extends ResourceRecord = LooseRecord> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  empty?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<TextField>` — displays a text value from a record field, the Vue analog of
 * `@chelone/react`'s `fields/text-field.tsx`. Reads the value at `source` off
 * the ambient (or overridden) record via `useFieldValue` and renders it in a
 * `<span>`. A nullish value renders the `empty` fallback (or nothing).
 */

import { formatFieldText } from "@chelone/core";
import { computed } from "vue";
import { useFieldValue } from "../../../record/use-field-value";

const props = defineProps<TextFieldProps<RecordType>>();

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const text = computed(() => formatFieldText(value.value));
</script>

<template>
  <span v-if="text != null" data-slot="text-field">{{ text }}</span>
  <span v-else-if="empty" data-slot="text-field">{{ empty }}</span>
</template>
