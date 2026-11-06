<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type { LooseRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link FileField}. */
export interface FileFieldProps<
  RecordType extends LooseRecord = LooseRecord,
> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  empty?: string;
  /** The path to the file url on each item, for an array of files. */
  src?: string;
  /** The path to the display title (or a literal label). */
  title?: string;
  target?: string;
  download?: string;
  ping?: string;
  rel?: string;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
/**
 * `<FileField>` — displays a downloadable file link (or a `<ul>` of links) from a
 * record field, the Vue port of `@chelone/react`'s `fields/file-field.tsx`. A
 * `title` may be a record path OR a literal label. Stops click bubbling so a
 * `DataTable` row-click doesn't fire. A nullish / empty-array value renders the
 * (translated) `empty` string, or nothing.
 */

import { computed } from "vue";
import { getAtPath } from "@chelone/core";
import { cn } from "../../../lib/utils";
import { useRecordContextRef } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<FileFieldProps<RecordType>>();

const sourceValue = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

// A `title` may be a record path OR a literal label, so it is read with
// `getAtPath` off the ambient record instead of `useFieldValue`: that hook wants
// a `SourceProp<RecordType>`, and a literal label is no record's path.
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

const isEmpty = computed(() => {
  const v = sourceValue.value;
  return v == null || (Array.isArray(v) && v.length === 0);
});

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

const isArray = computed(() => Array.isArray(sourceValue.value));

interface FileLink {
  href: string | undefined;
  title: string | undefined;
  key: string | number;
}

const links = computed<FileLink[]>(() => {
  if (!Array.isArray(sourceValue.value)) return [];
  return sourceValue.value.map((file, index) => {
    // Inside `props.title ?`, the fallback is never nullish.
    const fileTitleValue = props.title
      ? String(getAtPath(file, props.title) ?? props.title)
      : props.title;
    // `src` falls back to `props.title`, which may be absent: a miss stays
    // `undefined` so the link gets no href, never the text "undefined".
    const srcPath = props.src
      ? (getAtPath(file, props.src) ?? props.title)
      : props.title;
    const srcValue = srcPath == null ? undefined : String(srcPath);
    return { href: srcValue, title: fileTitleValue, key: srcValue ?? index };
  });
});

const singleHref = computed(() =>
  sourceValue.value == null ? undefined : String(sourceValue.value),
);

function stop(e: Event): void {
  e.stopPropagation();
}
</script>

<template>
  <div
    v-if="isEmpty && emptyText != null"
    :class="cn('inline-block', props.class)"
    data-slot="file-field"
  >
    {{ emptyText }}
  </div>
  <ul
    v-else-if="!isEmpty && isArray"
    :class="cn('inline-block', props.class)"
    data-slot="file-field"
  >
    <li v-for="link in links" :key="link.key">
      <a
        :href="link.href"
        :title="link.title"
        :target="props.target"
        :download="props.download"
        :ping="props.ping"
        :rel="props.rel"
        @click="stop"
        >{{ link.title }}</a
      >
    </li>
  </ul>
  <div
    v-else-if="!isEmpty"
    :class="cn('inline-block', props.class)"
    data-slot="file-field"
  >
    <a
      :href="singleHref"
      :title="titleValue"
      :target="props.target"
      :download="props.download"
      :ping="props.ping"
      :rel="props.rel"
      @click="stop"
      >{{ titleValue }}</a
    >
  </div>
</template>
