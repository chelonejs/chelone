<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import {
  getAtPath,
  type LooseRecord,
  type ResourceRecord,
  type SourceKey,
  type SourceProp,
  type SourceValue,
} from "@chelone/core";

/** Props for {@link RatingField}. */
export interface RatingFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
> {
  source: SourceProp<RecordType>;
  /** The record to render. Defaults to the ambient `RecordContext` value. */
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  empty?: string;
  /** Total stars rendered (filled + outlined). Default 5. */
  max?: number;
  /** Allow half-star granularity when the value falls between integers. */
  allowHalf?: boolean;
  /**
   * Sibling record field rendered in parentheses (e.g. a review count). A
   * top-level key, not a path: the read is `record[countSource]`.
   */
  countSource?: SourceKey<RecordType>;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<RatingField>` — displays a numeric rating as a row of filled/half/outlined
 * star icons, the Vue analog of `@chelone/react`'s `fields/rating-field.tsx`.
 * Reads the value at `source` off the ambient record; supports half-star
 * granularity, a configurable `max`, and an optional sibling `countSource`
 * (rendered in parentheses). A nullish value renders the `empty` fallback (or
 * nothing). The half star is filled via an SVG linear-gradient (parity with the
 * twin).
 */

import { computed } from "vue";
import { ratingStars, type RatingStar } from "@chelone/core";
import { useFieldValue } from "../../../record/use-field-value";
import { useRecordContextRef } from "../../../record/record-context";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<RatingFieldProps<RecordType>>();

const max = computed(() => props.max ?? 5);

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

// Reading `.value` inside the computed keeps `countSource` reactive as an async
// record resolves — parity with the twin's `useRecordContext`.
const ctxRecord = useRecordContextRef<RecordType>(() => props.record);
const translate = useTranslate();

const count = computed<number | undefined>(() => {
  const rec = ctxRecord.value;
  if (!props.countSource || !rec) return undefined;
  const c = getAtPath(rec, props.countSource);
  return typeof c === "number" ? c : undefined;
});

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

const rating = computed(() =>
  ratingStars(value.value, { max: max.value, allowHalf: props.allowHalf }),
);

const numericValue = computed(() => rating.value.value);

/** One entry per star: filled / half / empty, from core's `ratingStars`. */
const stars = computed(() => rating.value.stars);

const hasValue = computed(() => value.value != null);

function starFill(kind: RatingStar): string {
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
