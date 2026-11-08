<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord, SourceProp } from "@chelone/core";

/** Table (`side-by-side`, the default) or list (`inline`). */
export type DiffViewerMode = "side-by-side" | "inline";

/** Props for {@link DiffViewer}. */
export interface DiffViewerProps<
  RecordType extends ResourceRecord = LooseRecord,
> {
  /** The earlier version. */
  before: RecordType;
  /** The later version. */
  after: RecordType;
  /** Fields to show, in this order. Without it: every top-level key. */
  sources?: readonly SourceProp<RecordType>[];
  /** A label per source, replacing the translated field label. */
  labels?: Partial<Record<string, string>>;
  /** Table (`side-by-side`, the default) or list (`inline`). */
  mode?: DiffViewerMode;
  /** Resource whose field labels apply. Defaults to the ambient resource. */
  resource?: string;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<DiffViewer>` shows what changed between two versions of a record, one row
 * per field. The Vue analog of `@chelone/react`'s `fields/diff-viewer.tsx`.
 * Side by side is a table with the field, its before value and its after
 * value; inline is a list that shows the removed and added value in one line.
 * Each row has a `data-status` and a visually hidden status word, and every
 * value renders as text unless the `#value` slot says otherwise.
 */

import {
  type DiffStatus,
  diffRecords,
  formatDiffValue,
  type RecordDiffRow,
} from "@chelone/core";
import { computed, type VNode } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useTranslateLabel } from "../../../label/use-translate-label";
import { cn } from "../../../lib/utils";
import { ArrowRightIcon } from "../list/list-icons";

const props = withDefaults(defineProps<DiffViewerProps<RecordType>>(), {
  mode: "side-by-side",
});

defineSlots<{
  /** Replaces the default value text of a cell. */
  value?(scope: {
    source: string;
    // type-escape: a diffed value is whatever the record held at the source
    value: unknown;
    side: "before" | "after";
  }): VNode[];
}>();

const translate = useTranslate();
const translateLabel = useTranslateLabel();

const rows = computed(() =>
  diffRecords<RecordType>(props.before, props.after, props.sources),
);

const empty = computed(() =>
  translate("chelone.diff_viewer.empty", { _: "(empty)" }),
);

/** The default text of a value; a missing one reads as the empty text. */
// type-escape: a diffed value is whatever the record held at the source
function text(value: unknown): string {
  return formatDiffValue(value) || empty.value;
}

function labelOf(source: string): string | null {
  return (
    props.labels?.[source] ??
    translateLabel({ source, resource: props.resource })
  );
}

function statusWord(status: DiffStatus): string {
  return translate(`chelone.diff_viewer.status.${status}`, { _: status });
}

const removes = (row: RecordDiffRow<RecordType>) =>
  row.status === "removed" || row.status === "changed";
const adds = (row: RecordDiffRow<RecordType>) =>
  row.status === "added" || row.status === "changed";
</script>

<template>
  <ul
    v-if="props.mode === 'inline'"
    data-slot="diff-viewer"
    :data-mode="props.mode"
    :class="cn('flex flex-col gap-2 text-sm', props.class)"
  >
    <li
      v-for="row in rows"
      :key="row.source"
      :data-source="row.source"
      :data-status="row.status"
      class="flex flex-wrap items-baseline gap-x-2"
    >
      <span class="font-medium">{{ labelOf(row.source) }}</span>
      <span class="sr-only">{{ statusWord(row.status) }}</span>
      <span v-if="row.status === 'unchanged'">
        <slot name="value" :source="row.source" :value="row.after" side="after">{{
          text(row.after)
        }}</slot>
      </span>
      <del v-if="removes(row)">
        <slot name="value" :source="row.source" :value="row.before" side="before">{{
          text(row.before)
        }}</slot>
      </del>
      <ArrowRightIcon
        v-if="row.status === 'changed'"
        aria-hidden="true"
        class="size-3.5"
      />
      <ins v-if="adds(row)">
        <slot name="value" :source="row.source" :value="row.after" side="after">{{
          text(row.after)
        }}</slot>
      </ins>
    </li>
  </ul>
  <table
    v-else
    data-slot="diff-viewer"
    :data-mode="props.mode"
    :class="cn('w-full border-collapse text-sm', props.class)"
  >
    <thead>
      <tr class="text-left">
        <th scope="col" class="p-2 font-medium">
          {{ translate("chelone.diff_viewer.field", { _: "Field" }) }}
        </th>
        <th scope="col" class="p-2 font-medium">
          {{ translate("chelone.diff_viewer.before", { _: "Before" }) }}
        </th>
        <th scope="col" class="p-2 font-medium">
          {{ translate("chelone.diff_viewer.after", { _: "After" }) }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="row in rows"
        :key="row.source"
        :data-source="row.source"
        :data-status="row.status"
        class="border-t align-top"
      >
        <th scope="row" class="p-2 text-left font-medium">
          {{ labelOf(row.source) }}
          <span class="sr-only">{{ statusWord(row.status) }}</span>
        </th>
        <td class="p-2">
          <component
            :is="removes(row) ? 'del' : 'span'"
            :class="removes(row) ? 'bg-destructive/10 text-destructive' : undefined"
          >
            <slot name="value" :source="row.source" :value="row.before" side="before">{{
              text(row.before)
            }}</slot>
          </component>
        </td>
        <td class="p-2">
          <component
            :is="adds(row) ? 'ins' : 'span'"
            :class="adds(row) ? 'bg-primary/10 no-underline' : undefined"
          >
            <slot name="value" :source="row.source" :value="row.after" side="after">{{
              text(row.after)
            }}</slot>
          </component>
        </td>
      </tr>
    </tbody>
  </table>
</template>
