<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type {
  CalendarEvent,
  CalendarLabels,
  LooseRecord,
  ResourceRecord,
} from "@chelone/core";

/** Props for {@link CalendarWeekView}. */
export interface CalendarWeekViewProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  /** The seven days of the week, in order. */
  days: Date[];
  labels: CalendarLabels;
  /** The label of the grid. */
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
 * `<CalendarWeekView>` — seven day columns by 24 hour rows. An event shows in
 * the cell of its start hour only. Emits `select-event` with the record and
 * `select-slot` with that hour when an empty cell is clicked; a click on an
 * event never reaches the cell.
 */

import { calendarDayKey, calendarEventsInHour } from "@chelone/core";
import { onBeforeUnmount, ref, type VNode } from "vue";
import CalendarEventButton from "./calendar-event.vue";
import type {
  CalendarEventSlotProps,
  CalendarSlot,
} from "./calendar-month-view.vue";

const props = defineProps<CalendarWeekViewProps<TRecord>>();
const emit = defineEmits<{
  selectEvent: [record: TRecord];
  selectSlot: [slot: CalendarSlot];
}>();
defineSlots<{
  event?(props: CalendarEventSlotProps<TRecord>): VNode[];
}>();

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

// Re-read at each local midnight, so a calendar left open marks the new day.
const todayKey = ref(calendarDayKey(new Date()));
let midnightTimer: ReturnType<typeof setTimeout>;
function scheduleMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  midnightTimer = setTimeout(() => {
    todayKey.value = calendarDayKey(new Date());
    scheduleMidnight();
  }, midnight.getTime() - now.getTime());
}
scheduleMidnight();
onBeforeUnmount(() => clearTimeout(midnightTimer));

const eventsIn = (day: Date, hour: number) =>
  calendarEventsInHour(props.events, day, hour);

// `hour + 1` of 23 rolls over into the next day's midnight.
function selectSlot(day: Date, hour: number) {
  const at = (h: number) =>
    new Date(day.getFullYear(), day.getMonth(), day.getDate(), h).toISOString();
  emit("selectSlot", { startISO: at(hour), endISO: at(hour + 1), allDay: false });
}
</script>

<template>
  <div role="grid" :aria-label="label" data-slot="calendar-week">
    <div role="row" class="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))]">
      <div aria-hidden="true" />
      <div
        v-for="day in days"
        :key="calendarDayKey(day)"
        role="columnheader"
        :data-date="calendarDayKey(day)"
        :data-today="calendarDayKey(day) === todayKey ? '' : undefined"
        :aria-current="calendarDayKey(day) === todayKey ? 'date' : undefined"
        class="px-2 py-1 text-center text-xs font-medium text-muted-foreground"
      >
        {{ labels.weekday(day) }} {{ labels.dayNumber(day) }}
      </div>
    </div>
    <div
      v-for="hour in HOURS"
      :key="hour"
      role="row"
      class="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))]"
    >
      <div
        role="rowheader"
        class="px-2 py-1 text-right text-xs tabular-nums text-muted-foreground"
      >
        {{ labels.hour(hour) }}
      </div>
      <div
        v-for="day in days"
        :key="calendarDayKey(day)"
        role="gridcell"
        :data-date="calendarDayKey(day)"
        :data-hour="hour"
        :data-today="calendarDayKey(day) === todayKey ? '' : undefined"
        class="min-h-12 border-t border-l p-1 text-sm"
        @click="selectSlot(day, hour)"
      >
        <ul class="flex flex-col gap-1">
          <li
            v-for="(event, index) in eventsIn(day, hour)"
            :key="index"
            @click.stop
          >
            <slot name="event" v-bind="{ ...event, day }">
              <CalendarEventButton
                :event="event"
                :href="hrefFor(event.record)"
                :selectable="isSelectable(event.record)"
                @select="emit('selectEvent', $event)"
              />
            </slot>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
