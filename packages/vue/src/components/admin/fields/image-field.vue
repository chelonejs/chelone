<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type { LooseRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link ImageField}. */
export interface ImageFieldProps<
  RecordType extends LooseRecord = LooseRecord,
> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  empty?: string;
  /** The path to the image url on each item, for an array of images. */
  src?: string;
  /** The path to the display title (or a literal label). */
  title?: string;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
/**
 * `<ImageField>` — displays an image (or a `<ul>` of images) from a record field,
 * the Vue port of `@chelone/react`'s `fields/image-field.tsx`. A `title` may be a
 * record path OR a literal label. The rest class is applied to an enclosing
 * `<span>` in every case (empty / single / list) so each can be styled. A nullish
 * value renders the (translated) `empty` string, or nothing.
 */

import { computed } from "vue";
import { getAtPath } from "@chelone/core";
import { cn } from "../../../lib/utils";
import { useRecordContextRef } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<ImageFieldProps<RecordType>>();

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

// A `title` may be a record path OR a literal label, so it is read with
// `getAtPath` off the ambient record instead of `useFieldValue` (see
// `<FileField>`).
const ctxRecord = useRecordContextRef<RecordType>(() => props.record);
const titleFromRecord = computed(() =>
  props.title ? getAtPath(ctxRecord.value, props.title) : undefined,
);

const titleValue = computed(() =>
  props.title
    ? titleFromRecord.value == null
      ? props.title
      : String(titleFromRecord.value)
    : undefined,
);

const translate = useTranslate();

const isNull = computed(() => value.value == null);
const isArray = computed(() => Array.isArray(value.value));

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

interface ImageItem {
  src: string | undefined;
  title: string | undefined;
  key: string | number;
}

const items = computed<ImageItem[]>(() => {
  if (!Array.isArray(value.value)) return [];
  return value.value.map((file, index) => {
    const fileTitleValue = props.title
      ? String(getAtPath(file, props.title) ?? props.title)
      : props.title;
    const srcValue = props.src
      ? String(getAtPath(file, props.src) ?? props.title)
      : props.title;
    return { src: srcValue, title: fileTitleValue, key: srcValue ?? index };
  });
});

const singleSrc = computed(() =>
  value.value == null ? undefined : String(value.value),
);
</script>

<template>
  <span
    v-if="isNull && emptyText != null"
    :class="cn('image-empty', props.class)"
    data-slot="image-field"
    >{{ emptyText }}</span
  >
  <span
    v-else-if="!isNull && isArray"
    :class="cn('image-list', props.class)"
    data-slot="image-field"
  >
    <ul>
      <li v-for="item in items" :key="item.key">
        <img :alt="item.title" :title="item.title" :src="item.src" />
      </li>
    </ul>
  </span>
  <span
    v-else-if="!isNull"
    :class="cn('image-single', props.class)"
    data-slot="image-field"
  >
    <img :title="titleValue" :alt="titleValue" :src="singleSrc" />
  </span>
</template>
