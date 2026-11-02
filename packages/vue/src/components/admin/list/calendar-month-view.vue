<script lang="ts">
import type { CalendarEvent, LooseRecord } from "@chelone/core";

/** What the `#event` slot of a `<CalendarList>` receives: the event and the day cell it renders in. */
export interface CalendarEventSlotProps extends CalendarEvent<LooseRecord> {
  day: Date;
}

/** The time span `select-slot` reports. */
export interface CalendarSlot {
  startISO: string;
  endISO: string;
  allDay: boolean;
}

/** Props for {@link CalendarMonthView}. */
export interface CalendarMonthViewProps {
  /** Every day of the grid, whole weeks, in order. */
  days: Date[];
  /** Its month decides which days are outside the month. */
  anchor: Date;
  /** The weekday names, locale-formatted, one per column. */
  weekdays: string[];
  /** The label of the grid. */
  label: string;
  events: CalendarEvent<LooseRecord>[];
  /** The link an event is, when it navigates. */
  hrefFor: (record: LooseRecord) => string | undefined;
  /** Whether activating the event does anything: it is inert otherwise. */
  isSelectable: (record: LooseRecord) => boolean;
}
</script>

<script setup lang="ts">
/**
 * `<CalendarMonthView>` — a grid of whole weeks with the events of each day in
 * its cell. An event that spans days shows in every cell it covers. Emits
 * `select-event` with the record and `select-slot` when an empty part of a cell
 * is clicked; a click on an event never reaches the cell.
 */

import { calendarDayKey, calendarEventsOnDay } from "@chelone/core";
import { computed, onBeforeUnmount, ref } from "vue";
import { cn } from "../../../lib/utils";

const props = defineProps<CalendarMonthViewProps>();
const emit = defineEmits<{
  selectEvent: [record: LooseRecord];
  selectSlot: [slot: CalendarSlot];
}>();
defineSlots<{
  event?(props: CalendarEventSlotProps): unknown;
}>();

const weeks = computed(() => {
  const rows: Date[][] = [];
  for (let at = 0; at < props.days.length; at += 7) {
    rows.push(props.days.slice(at, at + 7));
  }
  return rows;
});

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

const eventsOn = (day: Date) => calendarEventsOnDay(props.events, day);

function selectSlot(day: Date) {
  emit("selectSlot", {
    startISO: new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
    ).toISOString(),
    endISO: new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      23,
      59,
      59,
      999,
    ).toISOString(),
    allDay: true,
  });
}

function onEventClick(event: MouseEvent, record: LooseRecord) {
  if (!props.isSelectable(record)) return;
  // A modified click keeps the browser's own link behaviour.
  const plain =
    event.button === 0 &&
    !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
  if (event.currentTarget instanceof HTMLAnchorElement && !plain) return;
  event.preventDefault();
  emit("selectEvent", record);
}

const tagFor = (event: CalendarEvent<LooseRecord>) =>
  props.hrefFor(event.record)
    ? "a"
    : props.isSelectable(event.record)
      ? "button"
      : "span";
</script>

<template>
  <div role="grid" :aria-label="label" aria-colcount="7" data-slot="calendar-month">
    <div role="row" class="grid grid-cols-7">
      <div
        v-for="(weekday, column) in weekdays"
        :key="column"
        role="columnheader"
        class="px-2 py-1 text-center text-xs font-medium text-muted-foreground"
      >
        {{ weekday }}
      </div>
    </div>
    <div
      v-for="week in weeks"
      :key="calendarDayKey(week[0]!)"
      role="row"
      class="grid grid-cols-7"
    >
      <div
        v-for="day in week"
        :key="calendarDayKey(day)"
        role="gridcell"
        :data-date="calendarDayKey(day)"
        :data-outside-month="day.getMonth() !== anchor.getMonth() ? '' : undefined"
        :data-today="calendarDayKey(day) === todayKey ? '' : undefined"
        :aria-current="calendarDayKey(day) === todayKey ? 'date' : undefined"
        :class="
          cn(
            'min-h-24 border-t border-l p-1 text-sm',
            day.getMonth() !== anchor.getMonth() && 'bg-muted/40 text-muted-foreground',
          )
        "
        @click="selectSlot(day)"
      >
        <span data-slot="calendar-day-number" class="text-xs tabular-nums">
          {{ day.getDate() }}
        </span>
        <ul class="mt-1 flex flex-col gap-1">
          <li
            v-for="(event, index) in eventsOn(day)"
            :key="index"
            @click.stop
          >
            <slot name="event" v-bind="{ ...event, day }">
              <component
                :is="tagFor(event)"
                data-slot="calendar-event"
                :data-color="event.color"
                :href="hrefFor(event.record)"
                :type="tagFor(event) === 'button' ? 'button' : undefined"
                :style="event.color ? { backgroundColor: event.color } : undefined"
                class="block w-full truncate rounded px-1.5 py-0.5 text-left text-xs"
                :class="event.color ? 'text-white' : 'bg-primary text-primary-foreground'"
                @click="onEventClick($event, event.record)"
              >
                {{ event.title }}
              </component>
            </slot>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
