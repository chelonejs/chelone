<script lang="ts">
import type { LooseRecord, SourceProp } from "@chelone/core";

/** Props for {@link RatingField}. */
export interface RatingFieldProps {
  source: SourceProp;
  record?: LooseRecord;
  defaultValue?: unknown;
  empty?: string;
  /** Total stars rendered (filled + outlined). Default 5. */
  max?: number;
  /** Allow half-star granularity when the value falls between integers. */
  allowHalf?: boolean;
  /** Sibling record source rendered in parentheses (e.g. a review count). */
  countSource?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<RatingField>` — displays a numeric rating as a row of filled/half/outlined
 * star icons, the Vue analog of `@chelone/react`'s `fields/rating-field.tsx`.
 * Reads the value at `source` off the ambient record; supports half-star
 * granularity, a configurable `max`, and an optional sibling `countSource`
 * (rendered in parentheses). A nullish value renders the `empty` fallback (or
 * nothing). The half star is filled via an SVG linear-gradient (parity with the
 * twin).
 */

import { computed, inject } from "vue";
import { useFieldValue } from "../../../record/use-field-value";
import { RecordContextKey } from "../../../record/record-context";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<RatingFieldProps>();

const max = computed(() => props.max ?? 5);

const value = useFieldValue({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

// Inject the record ref once (inject must run in setup); a `record` prop wins.
// Reading `.value` inside the computed keeps `countSource` reactive as an async
// record resolves — parity with the twin's `useRecordContext`.
const injectedRecord = inject(RecordContextKey, null);
const ctxRecord = computed(() => props.record ?? injectedRecord?.value);
const translate = useTranslate();

const count = computed<number | undefined>(() => {
  const rec = ctxRecord.value;
  if (!props.countSource || !rec) return undefined;
  const c = rec[props.countSource];
  return typeof c === "number" ? c : undefined;
});

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

const numericValue = computed(() =>
  typeof value.value === "number" ? value.value : Number(value.value),
);

/** One entry per star: filled / half / empty (mirrors the twin's `renderStars`). */
const stars = computed(() => {
  const out: Array<"filled" | "half" | "empty"> = [];
  for (let i = 1; i <= max.value; i++) {
    if (numericValue.value >= i) out.push("filled");
    else if (props.allowHalf && numericValue.value >= i - 0.5) out.push("half");
    else out.push("empty");
  }
  return out;
});

const hasValue = computed(() => value.value != null);

function starFill(kind: "filled" | "half" | "empty"): string {
  if (kind === "filled") return "currentColor";
  if (kind === "half") return "url(#rating-half)";
  return "none";
}
</script>

<template>
  <span
    v-if="hasValue"
    data-slot="rating-field"
    :class="['inline-flex items-center gap-1', props.class]"
    role="img"
    :aria-label="`${numericValue} out of ${max}`"
  >
    <span class="inline-flex">
      <svg
        v-for="(kind, i) in stars"
        :key="i"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.5"
        :fill="starFill(kind)"
        :data-rating-star="kind"
        class="text-yellow-500"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="rating-half">
            <stop offset="50%" stop-color="currentColor" />
            <stop offset="50%" stop-color="transparent" />
          </linearGradient>
        </defs>
        <polygon points="12 2 15 9 22 9 16 14 18 22 12 17 6 22 8 14 2 9 9 9" />
      </svg>
    </span>
    <span v-if="count != null" class="text-muted-foreground text-sm"
      >({{ count }})</span
    >
  </span>
  <span
    v-else-if="emptyText != null"
    data-slot="rating-field"
    :class="props.class"
    >{{ emptyText }}</span
  >
</template>
