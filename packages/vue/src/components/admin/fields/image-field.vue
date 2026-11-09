<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link ImageField}. */
export interface ImageFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
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

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<ImageField>` — displays an image (or a `<ul>` of images) from a record field,
 * the Vue port of `@chelone/react`'s `fields/image-field.tsx`. A `title` may be a
 * record path OR a literal label. The rest class is applied to an enclosing
 * `<span>` in every case (empty / single / list) so each can be styled. A nullish
 * value renders the (translated) `empty` string, or nothing.
 */

import { computed } from "vue";
import { imageFieldSources } from "@chelone/core";
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

// A `title` may be a record path OR a literal label, so core reads it with
// `getAtPath` off the ambient record instead of `useFieldValue` (see
// `<FileField>`).
const ctxRecord = useRecordContextRef<RecordType>(() => props.record);

const translate = useTranslate();

const images = computed(() =>
  imageFieldSources(value.value, ctxRecord.value, {
    src: props.src,
    title: props.title,
  }),
);
const isArray = computed(() => Array.isArray(value.value));

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);
</script>

<template>
  <span
    v-if="images === null && emptyText != null"
    :class="cn('image-empty', props.class)"
    data-slot="image-field"
    >{{ emptyText }}</span
  >
  <span
    v-else-if="images !== null && isArray"
    :class="cn('image-list', props.class)"
    data-slot="image-field"
  >
    <ul>
      <li v-for="(item, index) in images" :key="index">
        <img :alt="item.title" :title="item.title" :src="item.src" />
      </li>
    </ul>
  </span>
  <span
    v-else-if="images !== null"
    :class="cn('image-single', props.class)"
    data-slot="image-field"
  >
    <img
      :title="images[0]?.title"
      :alt="images[0]?.title"
      :src="images[0]?.src"
    />
  </span>
</template>
