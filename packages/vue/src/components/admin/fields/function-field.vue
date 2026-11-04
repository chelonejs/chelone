<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type { LooseRecord, SourceProp } from "@chelone/core";

/** Props for {@link FunctionField}. */
export interface FunctionFieldProps<RecordType extends LooseRecord = LooseRecord> {
  record?: RecordType;
  /** Optional source, forwarded to the default slot for convenience. */
  source?: SourceProp<RecordType>;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
/**
 * `<FunctionField>` — renders derived content from the ambient record, the Vue
 * analog of `@chelone/react`'s `fields/function-field.tsx`. Useful for composing
 * several record fields or displaying transformed data inside a `RecordContext`
 * (a `<Show>`, an `<ArrayField>` row, a `DataTable` column).
 *
 * Idiom translation from the twin: React takes a `render: (record, source?) =>
 * ReactNode` prop. The Vue-idiomatic mapping is a DEFAULT SCOPED SLOT — the slot
 * receives `{ record, source }`, so a consumer writes
 * `<FunctionField v-slot="{ record }">{{ record.first }} {{ record.last }}</FunctionField>`.
 * Renders nothing until an ambient (or overridden) record resolves.
 */

import { computed, inject } from "vue";
import { cn } from "../../../lib/utils";
import { RecordContextKey } from "../../../record/record-context";

const props = defineProps<FunctionFieldProps<RecordType>>();

defineSlots<{
  /** Receives the resolved record + optional source; renders the derived value. */
  default(props: { record: RecordType; source?: string }): unknown;
}>();

const injectedRecord = inject(RecordContextKey, null);
const record = computed<RecordType | undefined>(
  () => (props.record ?? injectedRecord?.value) as RecordType | undefined,
);
</script>

<template>
  <span
    v-if="record"
    data-slot="function-field"
    :class="cn(props.class)"
  >
    <slot :record="record" :source="source" />
  </span>
</template>
