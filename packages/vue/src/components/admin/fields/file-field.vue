<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link FileField}. */
export interface FileFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
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

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<FileField>` — displays a downloadable file link (or a `<ul>` of links) from a
 * record field, the Vue port of `@chelone/react`'s `fields/file-field.tsx`. A
 * `title` may be a record path OR a literal label. Stops click bubbling so a
 * `DataTable` row-click doesn't fire. A nullish / empty-array value renders the
 * (translated) `empty` string, or nothing. A url `isSafeFileUrl` rejects keeps
 * its anchor with no `href`, so a stored `javascript:` url cannot run on click.
 */

import { computed } from "vue";
import { fileFieldLinks } from "@chelone/core";
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

// A `title` may be a record path OR a literal label, so core reads it with
// `getAtPath` off the ambient record instead of `useFieldValue`: that hook wants
// a `SourceProp<RecordType>`, and a literal label is no record's path.
const ctxRecord = useRecordContextRef<RecordType>(() => props.record);

const translate = useTranslate();

const links = computed(() =>
  fileFieldLinks(sourceValue.value, ctxRecord.value, {
    src: props.src,
    title: props.title,
  }),
);

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

const isArray = computed(() => Array.isArray(sourceValue.value));

function stop(e: Event): void {
  e.stopPropagation();
}
</script>

<template>
  <div
    v-if="links === null && emptyText != null"
    :class="cn('inline-block', props.class)"
    data-slot="file-field"
  >
    {{ emptyText }}
  </div>
  <ul
    v-else-if="links !== null && isArray"
    :class="cn('inline-block', props.class)"
    data-slot="file-field"
  >
    <li v-for="(link, index) in links" :key="index">
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
    v-else-if="links !== null"
    :class="cn('inline-block', props.class)"
    data-slot="file-field"
  >
    <a
      :href="links[0]?.href"
      :title="links[0]?.title"
      :target="props.target"
      :download="props.download"
      :ping="props.ping"
      :rel="props.rel"
      @click="stop"
      >{{ links[0]?.title }}</a
    >
  </div>
</template>
