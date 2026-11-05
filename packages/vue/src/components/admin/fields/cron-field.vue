<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type { LooseRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link CronField}. */
export interface CronFieldProps<RecordType extends LooseRecord = LooseRecord> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  empty?: string;
  /** When true, render the raw cron expression below the human phrase. */
  showExpression?: boolean;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
/**
 * `<CronField>` — displays a 5-field cron expression as a human-readable phrase
 * (via `cronstrue`, through the shared `describeCron` helper). The Vue analog of
 * `@chelone/react`'s `fields/cron-field.tsx`. Falls back to the raw string in a
 * mono span on parse failure; a nullish/empty value renders the `empty` fallback
 * (or nothing). `showExpression` renders the raw expression under the phrase.
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";
import { describeCron } from "../inputs/cron-utils";

const props = defineProps<CronFieldProps<RecordType>>();

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

const expr = computed(() => (isEmptyValue.value ? null : String(value.value)));

const phrase = computed(() =>
  expr.value != null ? describeCron(expr.value) : null,
);
</script>

<template>
  <span
    v-if="expr != null && phrase == null"
    data-slot="cron-field"
    :class="cn('font-mono text-sm text-muted-foreground', props.class)"
    >{{ expr }}</span
  >
  <span
    v-else-if="expr != null && phrase != null"
    data-slot="cron-field"
    :class="cn('inline-flex flex-col', props.class)"
  >
    <span class="text-sm">{{ phrase }}</span>
    <span
      v-if="showExpression"
      class="font-mono text-xs text-muted-foreground"
      >{{ expr }}</span
    >
  </span>
  <span
    v-else-if="emptyText != null"
    data-slot="cron-field"
    :class="props.class"
    >{{ emptyText }}</span
  >
</template>
