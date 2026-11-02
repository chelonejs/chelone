<script lang="ts">
import type {
  CalendarRange,
  CalendarView,
  CalendarWeekStart,
} from "@chelone/core";
import type { CalendarNavigateDirection } from "./calendar-header.vue";

/** Props for {@link CalendarList}. */
export interface CalendarListProps {
  /** The field holding the start of an event; a dotted path reads a nested value. */
  startSource: string;
  /** The field holding the end. An event with none, or one before its start, covers its start day only. */
  endSource?: string;
  /** The string field shown as the event title; the record representation otherwise. */
  titleSource?: string;
  /** The field whose value picks a color from `colorMap`. */
  colorSource?: string;
  colorMap?: Record<string, string>;
  /** The view shown first. Default `month`. */
  defaultView?: CalendarView;
  /** The views offered. Only `month` exists yet, so the others are dropped. Default `["month"]`. */
  views?: CalendarView[];
  /** 0 is Sunday, as in `Date#getDay`. Default 0. */
  weekStartsOn?: CalendarWeekStart;
  /** How many records one fetch asks for. Default 1000. */
  perPage?: number;
  /**
   * The list filter that asks for the visible range. By default records whose
   * `startSource` falls in it: `${startSource}_gte` and `${startSource}_lte`.
   * The keys it returns replace those.
   */
  rangeFilter?: (range: CalendarRange) => Record<string, unknown>;
  /**
   * Where an event links to when nothing listens to `select-event`. `edit` by
   * default, `show` when the resource has no edit view, and an inert event when
   * it has neither. `false` leaves events inert.
   */
  linkType?: "edit" | "show" | false;
  class?: string;
}

/** What the `#header` slot receives. */
export interface CalendarHeaderSlotProps {
  range: CalendarRange;
  anchor: Date;
  view: CalendarView;
  onNavigate: (direction: CalendarNavigateDirection) => void;
  onViewChange: (view: CalendarView) => void;
}
</script>

<script setup lang="ts">
/**
 * `<CalendarList>` — the records of the ambient `<List>` as events in a month
 * grid. The Vue analog of `@chelone/react`'s `list/calendar-list.tsx`. It asks
 * the list for the visible range (and `perPage` records), so moving to another
 * month refetches; it removes that filter and restores `perPage` when it
 * unmounts. The filters the user set stay.
 *
 * Emits `select-event` with the record when an event is activated; with no
 * listener attached, the event navigates to the record's edit or show page.
 * Emits `select-slot` with `{ startISO, endISO, allDay }` when an empty part of
 * a day is clicked. The `#event` slot replaces an event and the `#header` slot
 * the title and navigation.
 *
 * @example
 * <List>
 *   <CalendarList start-source="starts_at" end-source="ends_at" title-source="name" />
 * </List>
 */

import {
  type CalendarEvent,
  calendarDays,
  calendarLabels,
  calendarRange,
  calendarRangeFilter,
  type LooseRecord,
  shiftCalendarAnchor,
  toCalendarEvents,
} from "@chelone/core";
import {
  computed,
  getCurrentInstance,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import { useResourceDefinition } from "../../../admin/resource-registry";
import { useLocale } from "../../../i18n/use-locale";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import { cn } from "../../../lib/utils";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import { useCreatePath, useNavigate } from "../../../router";
import CalendarHeader from "./calendar-header.vue";
import CalendarMonthView, {
  type CalendarEventSlotProps,
  type CalendarSlot,
} from "./calendar-month-view.vue";

// A `false` in the union makes Vue cast an absent prop to `false`.
const props = withDefaults(defineProps<CalendarListProps>(), {
  linkType: undefined,
  endSource: undefined,
  titleSource: undefined,
  colorSource: undefined,
  colorMap: undefined,
  rangeFilter: undefined,
  defaultView: "month",
  views: () => ["month"],
  weekStartsOn: 0,
  perPage: 1000,
});
const emit = defineEmits<{
  selectEvent: [record: LooseRecord];
  selectSlot: [slot: CalendarSlot];
}>();
defineSlots<{
  /** Replaces an event in its day cell. */
  event?(props: CalendarEventSlotProps): unknown;
  /** Replaces the title and the navigation. */
  header?(props: CalendarHeaderSlotProps): unknown;
}>();

const list = useListContext();
const resource = useResourceContext();
const getRepresentation = useGetRecordRepresentation(resource);
const navigate = useNavigate();
const createPath = useCreatePath();
const definition = useResourceDefinition(() => ({ resource }));
const locale = useLocale();
// Declared emits are stripped from `$attrs`, so the vnode props are the only
// place to tell whether a parent attached `@select-event`. `@select-event.once`
// compiles to `onSelectEventOnce`, which `emit` also honours.
const instance = getCurrentInstance();
const hasListener = () => {
  const listeners = instance?.vnode.props;
  return !!(listeners?.onSelectEvent || listeners?.onSelectEventOnce);
};

// Only the month view exists yet.
const available = computed<CalendarView[]>(() =>
  props.views.filter((view) => view === "month"),
);
const view = ref<CalendarView>("month");
function onViewChange(next: CalendarView) {
  if (available.value.includes(next)) view.value = next;
}
onViewChange(props.defaultView);

const anchor = ref(new Date());
const range = computed(() =>
  calendarRange(view.value, anchor.value, props.weekStartsOn),
);
const days = computed(() => calendarDays(range.value));

function onNavigate(direction: CalendarNavigateDirection) {
  anchor.value =
    direction === "today"
      ? new Date()
      : shiftCalendarAnchor(
          view.value,
          anchor.value,
          direction === "next" ? 1 : -1,
        );
}

const labels = computed(() => calendarLabels(locale.value));
const title = computed(() =>
  labels.value.title(view.value, anchor.value, range.value),
);
const weekdays = computed(() =>
  days.value.slice(0, 7).map((day) => labels.value.weekday(day)),
);

const events = computed<CalendarEvent<LooseRecord>[]>(() =>
  toCalendarEvents((list.data ?? []) as LooseRecord[], {
    startSource: props.startSource,
    endSource: props.endSource,
    titleSource: props.titleSource,
    colorSource: props.colorSource,
    colorMap: props.colorMap,
    getTitle: getRepresentation,
  }),
);

// The range asked of the list. The keys it set are remembered, so the next
// range and the unmount remove those and no others.
const rangeValue = computed(() =>
  props.rangeFilter
    ? props.rangeFilter(range.value)
    : calendarRangeFilter(props.startSource, range.value),
);
const rangeStartISO = computed(() => range.value.start.toISOString());
const rangeEndISO = computed(() => range.value.end.toISOString());
const originalPerPage = list.perPage;
let appliedKeys: string[] = [];

const without = (filter: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(
    Object.entries(filter).filter(([key]) => !keys.includes(key)),
  );
// A filter form that replaces the whole filter drops the range: ask again.
const inSync = computed(
  () =>
    list.perPage === props.perPage &&
    Object.entries(rangeValue.value).every(
      ([key, value]) => list.filter[key] === value,
    ),
);

watch(
  [rangeStartISO, rangeEndISO, () => props.startSource, () => props.perPage, inSync],
  () => {
    if (inSync.value) return;
    const next = rangeValue.value;
    list.setParams({
      filter: { ...without(list.filter, appliedKeys), ...next },
      perPage: props.perPage,
    });
    appliedKeys = Object.keys(next);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  list.setParams({
    filter: without(list.filter, appliedKeys),
    perPage: originalPerPage,
  });
});

// A resource that registers neither view has no route to link to.
const type = computed(
  () =>
    props.linkType ??
    (definition.value.hasEdit
      ? "edit"
      : definition.value.hasShow
        ? "show"
        : false),
);
const linkTo = (record: LooseRecord) =>
  resource && type.value
    ? createPath({ resource, id: record.id, type: type.value })
    : undefined;

function onSelectEvent(record: LooseRecord) {
  if (hasListener()) return emit("selectEvent", record);
  const to = linkTo(record);
  if (to) navigate(to);
}
</script>

<template>
  <div
    data-slot="calendar-list"
    :aria-busy="list.isFetching ? 'true' : undefined"
    :class="cn('flex flex-col gap-3', props.class)"
  >
    <slot
      v-if="$slots.header"
      name="header"
      :range="range"
      :anchor="anchor"
      :view="view"
      :onNavigate="onNavigate"
      :onViewChange="onViewChange"
    />
    <CalendarHeader v-else :title="title" @navigate="onNavigate" />
    <CalendarMonthView
      :days="days"
      :anchor="anchor"
      :weekdays="weekdays"
      :label="title"
      :events="events"
      :href-for="(record) => (hasListener() ? undefined : linkTo(record))"
      :is-selectable="(record) => hasListener() || linkTo(record) !== undefined"
      @select-event="onSelectEvent"
      @select-slot="emit('selectSlot', $event)"
    >
      <template v-if="$slots.event" #event="slotProps">
        <slot name="event" v-bind="slotProps" />
      </template>
    </CalendarMonthView>
  </div>
</template>
