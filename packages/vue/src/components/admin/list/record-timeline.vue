<script lang="ts" generic="TRecord extends LooseRecord = LooseRecord">
import type { LooseRecord, SourceProp } from "@chelone/core";
import type { Component } from "vue";

/** Props for {@link RecordTimeline}. */
export interface RecordTimelineProps<
  TRecord extends LooseRecord = LooseRecord,
> {
  /** The field printed as the entry's text; a dotted path reads a nested value. */
  messageSource: SourceProp<TRecord>;
  /** The field holding the entry's date. An invalid or missing date leaves the time out. */
  timestampSource: SourceProp<TRecord>;
  /** The field holding who did it. Without it, or with no value, the entry shows no user. */
  userSource?: SourceProp<TRecord>;
  /** The field whose value picks an entry of `icons`. */
  iconSource?: SourceProp<TRecord>;
  /** Icons by the value of `iconSource`. An entry with no match shows a clock. */
  icons?: Record<string, Component>;
  class?: string;
}
</script>

<script
  setup
  lang="ts"
  generic="TRecord extends LooseRecord = LooseRecord"
>
/**
 * `<RecordTimeline>` — the records of the ambient list as a dated activity
 * list, one entry per record in list order. The Vue analog of
 * `@chelone/react`'s `list/record-timeline.tsx`. It fetches nothing: put it in
 * a `<ReferenceManyField>` or a `<List>`, whose `sort` sets the order. The
 * relative time is computed at render and does not tick while the page stays
 * open. The `loading` and `empty` slots replace `SimpleListLoading` and the
 * translated "No activity yet".
 *
 * @example
 * <ReferenceManyField
 *   reference="events"
 *   target="post_id"
 *   :sort="{ field: 'at', order: 'DESC' }"
 * >
 *   <RecordTimeline message-source="message" timestamp-source="at" user-source="by" />
 * </ReferenceManyField>
 */

import { formatRelativeTime, toTimelineEntries } from "@chelone/core";
import { computed, type VNode } from "vue";
import { useLocale } from "../../../i18n/use-locale";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { useListContext } from "../../../list/list-context";
import { ClockIcon } from "./list-icons";
import SimpleListLoading from "./simple-list-loading.vue";

const props = defineProps<RecordTimelineProps<TRecord>>();
defineSlots<{
  /** Rendered while the list is pending, in place of `SimpleListLoading`. */
  loading?(): VNode[];
  /** Rendered with no records, in place of the translated "No activity yet". */
  empty?(): VNode[];
}>();

const list = useListContext<LooseRecord>();
const translate = useTranslate();
const locale = useLocale();

const timeline = computed(() => {
  // The relative time is computed here, at render, and does not tick.
  const now = new Date();
  return toTimelineEntries<LooseRecord>(list.data ?? [], {
    messageSource: props.messageSource,
    timestampSource: props.timestampSource,
    userSource: props.userSource,
    iconSource: props.iconSource,
  }).map((entry) => ({
    ...entry,
    icon: iconFor(entry.icon),
    time:
      entry.date === undefined
        ? undefined
        : {
            iso: entry.date.toISOString(),
            full: entry.date.toLocaleString(locale.value),
            relative: formatRelativeTime(entry.date, now, locale.value),
          },
  }));
});

// Own keys only: "constructor" or "valueOf" would find Object's.
function iconFor(key: string | undefined): Component {
  const { icons } = props;
  return (
    (key !== undefined &&
      icons !== undefined &&
      Object.hasOwn(icons, key) &&
      icons[key]) ||
    ClockIcon
  );
}
</script>

<template>
  <template v-if="list.isPending">
    <slot v-if="$slots.loading" name="loading" />
    <SimpleListLoading v-else :class="props.class" />
  </template>
  <template v-else-if="timeline.length === 0">
    <slot v-if="$slots.empty" name="empty" />
    <p
      v-else
      data-slot="record-timeline-empty"
      :class="cn('text-sm text-muted-foreground', props.class)"
    >
      {{ translate("chelone.record_timeline.empty", { _: "No activity yet" }) }}
    </p>
  </template>
  <ol v-else data-slot="record-timeline" :class="cn('flex flex-col', props.class)">
    <li
      v-for="entry in timeline"
      :key="entry.id"
      data-slot="record-timeline-entry"
      :data-entry-id="entry.id"
      class="flex gap-3 py-2"
    >
      <span aria-hidden="true" class="mt-0.5 shrink-0">
        <component :is="entry.icon" class="size-4 text-muted-foreground" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="text-sm">{{ entry.message }}</span>
        <span class="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          <span v-if="entry.user !== undefined" data-slot="record-timeline-user">{{
            entry.user
          }}</span>
          <time v-if="entry.time" :datetime="entry.time.iso" :title="entry.time.full">{{
            entry.time.relative
          }}</time>
        </span>
      </div>
    </li>
  </ol>
</template>
