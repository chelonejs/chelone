<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type {
  CalendarEvent,
  CalendarLabels,
  CalendarRange,
  LooseRecord,
  ResourceRecord,
} from "@chelone/core";

/** Props for {@link CalendarAgendaView}. */
export interface CalendarAgendaViewProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  range: CalendarRange;
  labels: CalendarLabels;
  /** The label of the list. */
  label: string;
  events: CalendarEvent<TRecord>[];
  /** The link an event is, when it navigates. */
  hrefFor: (record: TRecord) => string | undefined;
  /** Whether activating the event does anything: it is inert otherwise. */
  isSelectable: (record: TRecord) => boolean;
}
</script>

<script
  setup
  lang="ts"
  generic="TRecord extends ResourceRecord = LooseRecord"
>
/**
 * `<CalendarAgendaView>` — the events of the range as a list, a heading per day
 * with the events that start on it, earliest first. Emits `select-event` with
 * the record.
 */

import { groupCalendarAgenda } from "@chelone/core";
import { computed, type VNode } from "vue";
import { useLocale } from "../../../i18n/use-locale";
import { useTranslate } from "../../../i18n/use-translate";
import CalendarEventButton from "./calendar-event.vue";
import type { CalendarEventSlotProps } from "./calendar-month-view.vue";

const props = defineProps<CalendarAgendaViewProps<TRecord>>();
const emit = defineEmits<{ selectEvent: [record: TRecord] }>();
defineSlots<{
  event?(props: CalendarEventSlotProps<TRecord>): VNode[];
}>();

const translate = useTranslate();
const locale = useLocale();
const groups = computed(() => groupCalendarAgenda(props.events, props.range));
const time = computed(
  () => new Intl.DateTimeFormat(locale.value, { timeStyle: "short" }),
);
</script>

<template>
  <div :aria-label="label" role="region" data-slot="calendar-agenda">
    <p
      v-if="groups.length === 0"
      data-slot="calendar-agenda-empty"
      class="px-2 py-6 text-center text-sm text-muted-foreground"
    >
      {{ translate("chelone.calendar.no_events", { _: "No events in this range" }) }}
    </p>
    <section
      v-for="group in groups"
      :key="group.key"
      data-slot="calendar-agenda-day"
      :data-date="group.key"
      class="border-t py-2"
    >
      <h3 class="px-2 text-sm font-medium">{{ labels.agendaDay(group.day) }}</h3>
      <ul class="mt-1 flex flex-col gap-1 px-2">
        <li
          v-for="(event, index) in group.events"
          :key="index"
          class="flex items-center gap-2"
        >
          <slot name="event" v-bind="{ ...event, day: group.day }">
            <time
              class="w-20 shrink-0 text-xs tabular-nums text-muted-foreground"
              :datetime="event.start.toISOString()"
            >
              {{ time.format(event.start) }}
            </time>
            <CalendarEventButton
              :event="event"
              :href="hrefFor(event.record)"
              :selectable="isSelectable(event.record)"
              @select="emit('selectEvent', $event)"
            />
          </slot>
        </li>
      </ul>
    </section>
  </div>
</template>
