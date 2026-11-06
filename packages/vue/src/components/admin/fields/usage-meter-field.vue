<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type {
  LooseRecord,
  SourceKey,
  SourceProp,
  SourceValue,
} from "@chelone/core";

/** Ratio thresholds toggling the warning / critical bar color. */
export interface UsageMeterThresholds {
  warning: number;
  critical: number;
}

/** Props for {@link UsageMeterField}. */
export interface UsageMeterFieldProps<
  RecordType extends LooseRecord = LooseRecord,
> {
  source: SourceProp<RecordType>;
  /** The record to render. Defaults to the ambient `RecordContext` value. */
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  /**
   * Sibling record field holding the limit/quota; the bar is only shown when
   * set. A top-level key, not a path: the read is `record[limitSource]`.
   */
  limitSource?: SourceKey<RecordType>;
  /** Optional unit suffix (e.g. "GB", "requests"). */
  unit?: string;
  /** Ratio thresholds. Defaults `{ warning: 0.8, critical: 1.0 }`. */
  thresholds?: UsageMeterThresholds;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
/**
 * `<UsageMeterField>` — displays a numeric usage value relative to an optional
 * limit, rendering a progress bar that shifts color at configurable thresholds.
 * The Vue analog of `@chelone/react`'s `fields/usage-meter-field.tsx`. Reads
 * `source` for the used value and `limitSource` (a sibling field) for the limit;
 * with no `limitSource` it renders only the bare value. A nullish used value
 * renders nothing (parity with the twin).
 *
 * Idiom translation from the twin: React composes the shadcn `<Progress>`
 * primitive. The Vue `ui/` slice ships no `Progress`, so the bar is a plain
 * track + indicator `<div>` pair (indicator width = clamped percent), colored by
 * the derived `state` — same visual contract, zero new primitive.
 */

import { computed, inject } from "vue";
import { cn } from "../../../lib/utils";
import { RecordContextKey } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";

const props = defineProps<UsageMeterFieldProps<RecordType>>();

const DEFAULT_THRESHOLDS: UsageMeterThresholds = { warning: 0.8, critical: 1.0 };

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const used = computed<number | null | undefined>(() =>
  typeof value.value === "number" ? value.value : (value.value as null | undefined),
);

// The limit is a plain own-key read of a sibling field, not a path walk, so the
// record is read as a loose one.
const injectedRecord = inject(RecordContextKey, null);
const ctxRecord = computed<LooseRecord | undefined>(
  () => props.record ?? injectedRecord?.value,
);

const limit = computed<number | undefined>(() => {
  const rec = ctxRecord.value;
  if (!props.limitSource || !rec) return undefined;
  const l = rec[props.limitSource];
  return typeof l === "number" ? l : undefined;
});

const thresholds = computed(() => props.thresholds ?? DEFAULT_THRESHOLDS);

const hasUsed = computed(() => used.value != null);

const ratio = computed(() =>
  limit.value != null && used.value != null ? used.value / limit.value : 0,
);

const state = computed<"ok" | "warning" | "critical">(() => {
  if (ratio.value >= thresholds.value.critical) return "critical";
  if (ratio.value >= thresholds.value.warning) return "warning";
  return "ok";
});

const pct = computed(() => Math.min(100, Math.round(ratio.value * 100)));

const indicatorClass = computed(() =>
  cn(
    "h-full rounded-full bg-primary transition-all",
    state.value === "warning" && "bg-yellow-500",
    state.value === "critical" && "bg-red-500",
  ),
);
</script>

<template>
  <template v-if="hasUsed">
    <span
      v-if="limit == null"
      data-slot="usage-meter-field"
      :class="cn('text-sm tabular-nums', props.class)"
      >{{ used }}{{ unit ? ` ${unit}` : "" }}</span
    >
    <span
      v-else
      data-slot="usage-meter-field"
      data-usage-meter
      :data-state="state"
      :class="cn('inline-flex flex-col gap-1', props.class)"
    >
      <span
        class="relative h-2 w-full overflow-hidden rounded-full bg-primary/20"
        role="progressbar"
        :aria-valuenow="pct"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span :class="indicatorClass" :style="{ width: `${pct}%` }" />
      </span>
      <span class="text-muted-foreground text-xs tabular-nums"
        >{{ used }} / {{ limit }}{{ unit ? ` ${unit}` : "" }}</span
      >
    </span>
  </template>
</template>
