<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type {
  CalendarRange,
  CalendarView,
  CalendarWeekStart,
  LooseRecord,
  ResourceRecord,
  SourcePath,
  SourceProp,
} from "@chelone/core";
import type { CalendarNavigateDirection } from "./calendar-header.vue";

/** Props for {@link CalendarList}. */
export interface CalendarListProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  /** The field holding the start of an event; a dotted path reads a nested value. */
  startSource: SourceProp<TRecord>;
  /** The field holding the end. An event with none, or one before its start, covers its start day only. */
  endSource?: SourceProp<TRecord>;
  /** The string field shown as the event title; the record representation otherwise. */
  titleSource?: SourceProp<TRecord>;
  /** The field whose value picks a color from `colorMap`. */
  colorSource?: SourceProp<TRecord>;
  colorMap?: Record<string, string>;
  /** The view shown first. Default `month`. */
  defaultView?: CalendarView;
  /**
   * The views offered. The first one is shown when `defaultView` is not among
   * them. Default `["month", "week", "agenda"]`.
   */
  views?: CalendarView[];
  /** 0 is Sunday, as in `Date#getDay`. Default 0. */
  weekStartsOn?: CalendarWeekStart;
  /** How many records one fetch asks for. Default 1000. */
  perPage?: number;
  /**
   * The list filter that asks for the visible range. By default records whose
   * `startSource` falls in it: `${startSource}_gte` and `${startSource}_lte`.
   * With `endSource` set, records that end in it or after it instead:
   * `${startSource}_lte` and `${endSource}_gte`, which also fetches an event
   * that starts before the range. A record with an empty end is then left out,
   * so such data needs a custom `rangeFilter`. The keys it returns replace
   * those.
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

<script
  setup
  lang="ts"
  generic="TRecord extends ResourceRecord = LooseRecord"
>
/**
 * `<CalendarList>` — the records of the ambient `<List>` as events in a month
 * grid, or in a week of hour rows, or in an agenda. The Vue analog of `@chelone/react`'s `list/calendar-list.tsx`. It asks
 * the list for the visible range (and `perPage` records), so moving to another
 * month refetches; it removes that filter and restores `perPage` when it
 * unmounts. The filters the user set stay.
 *
 * Emits `select-event` with the record when an event is activated; with no
 * listener attached, the event navigates to the record's edit or show page.
 * Emits `select-slot` with `{ startISO, endISO, allDay }` when an empty part of
 * a day is clicked. With a `drop` listener attached, month-view events can be
 * dragged to another day; `drop` carries the record and its new `{ start, end? }`
 * as ISO strings and the list is not updated. A promise the listener returns is
 * the caller's to handle. The `#event` slot replaces an event and the `#header` slot
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
  DEFAULT_PER_PAGE,
  shiftCalendarAnchor,
  staleCalendarRangeKeys,
  toCalendarEvents,
} from "@chelone/core";
import {
  computed,
  getCurrentInstance,
  onBeforeUnmount,
  ref,
  type VNode,
  watch,
} from "vue";
import { useResourceDefinition } from "../../../admin/resource-registry";
import { useLocale } from "../../../i18n/use-locale";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import { cn } from "../../../lib/utils";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import { useCreatePath, useNavigate } from "../../../router";
import CalendarAgendaView from "./calendar-agenda-view.vue";
import CalendarHeader from "./calendar-header.vue";
import CalendarMonthView, {
  type CalendarEventSlotProps,
  type CalendarDrop,
  type CalendarSlot,
} from "./calendar-month-view.vue";
import CalendarWeekView from "./calendar-week-view.vue";

// A `false` in the union makes Vue cast an absent prop to `false`.
const props = withDefaults(defineProps<CalendarListProps<TRecord>>(), {
  linkType: undefined,
  endSource: undefined,
  titleSource: undefined,
  colorSource: undefined,
  colorMap: undefined,
  rangeFilter: undefined,
  defaultView: "month",
  views: () => ["month", "week", "agenda"],
  weekStartsOn: 0,
  perPage: 1000,
});
const emit = defineEmits<{
  selectEvent: [record: TRecord];
  selectSlot: [slot: CalendarSlot];
  drop: [record: TRecord, range: CalendarDrop];
}>();
defineSlots<{
  /** Replaces an event in its day cell. */
  event?(props: CalendarEventSlotProps<TRecord>): VNode[];
  /** Replaces the title and the navigation. */
  header?(props: CalendarHeaderSlotProps): VNode[];
}>();

const list = useListContext<TRecord>();
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
// Events are draggable in the month only when something listens to `drop`.
const hasDropListener = () => {
  const listeners = instance?.vnode.props;
  return !!(listeners?.onDrop || listeners?.onDropOnce);
};

const VIEWS: CalendarView[] = ["month", "week", "agenda"];
// Offered in the order given, each once; none left means the month.
const available = computed<CalendarView[]>(() => {
  const offered = props.views.filter(
    (name, at) => VIEWS.includes(name) && props.views.indexOf(name) === at,
  );
  return offered.length > 0 ? offered : ["month"];
});
const view = ref<CalendarView>(
  available.value.includes(props.defaultView)
    ? props.defaultView
    : available.value[0] ?? props.defaultView,
);
function onViewChange(next: CalendarView) {
  if (available.value.includes(next)) view.value = next;
}
watch(available, (offered) => {
  if (!offered.includes(view.value)) view.value = offered[0] ?? props.defaultView;
});

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

const pathOf = (source: SourceProp<TRecord>): SourcePath<TRecord> => {
  // A source prop is `SourceProp`, which core reads with `getAtPath`, taking any
  // path string. `toCalendarEvents` names the record's exact path type instead.
  // type-escape: a source prop for any record cannot carry that exact type.
  return source as SourcePath<TRecord>;
};
const pathOfOptional = (
  source: SourceProp<TRecord> | undefined,
): SourcePath<TRecord> | undefined =>
  source === undefined ? undefined : pathOf(source);

const events = computed<CalendarEvent<TRecord>[]>(() =>
  toCalendarEvents<TRecord>(list.data ?? [], {
    startSource: pathOf(props.startSource),
    endSource: pathOfOptional(props.endSource),
    titleSource: pathOfOptional(props.titleSource),
    colorSource: pathOfOptional(props.colorSource),
    colorMap: props.colorMap,
    getTitle: getRepresentation,
  }),
);

// The range asked of the list. The keys it set are remembered, so the next
// range and the unmount remove those and no others.
const rangeValue = computed(() =>
  props.rangeFilter
    ? props.rangeFilter(range.value)
        : calendarRangeFilter<TRecord>(
        pathOf(props.startSource),
        range.value,
        pathOfOptional(props.endSource),
      ),
);
const rangeStartISO = computed(() => range.value.start.toISOString());
const rangeEndISO = computed(() => range.value.end.toISOString());
// A URL or store that already holds the calendar's own `perPage` (back from an
// event's page, a reload) hides the list's real one: fall back to its default.
const originalPerPage =
  list.perPage === props.perPage
    ? (list.defaultPerPage ?? DEFAULT_PER_PAGE)
    : list.perPage;
let appliedKeys: string[] = [];

const without = (filter: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(
    Object.entries(filter).filter(([key]) => !keys.includes(key)),
  );
const staleKeys = computed(() =>
  props.rangeFilter
    ? []
    : staleCalendarRangeKeys<TRecord>(
        pathOf(props.startSource),
        pathOfOptional(props.endSource),
      ),
);
// A filter form that replaces the whole filter drops the range: ask again.
const inSync = computed(
  () =>
    list.perPage === props.perPage &&
    staleKeys.value.every((key) => !(key in list.filter)) &&
    Object.entries(rangeValue.value).every(
      ([key, value]) => list.filter[key] === value,
    ),
);

watch(
  [
    rangeStartISO,
    rangeEndISO,
    () => props.startSource,
    () => props.endSource,
    () => props.perPage,
    inSync,
  ],
  () => {
    if (inSync.value) return;
    const next = rangeValue.value;
    list.setParams({
      filter: { ...without(list.filter, [...appliedKeys, ...staleKeys.value]), ...next },
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
const linkTo = (record: TRecord) =>
  !resource || type.value === false
    ? undefined
    : createPath({ resource, id: record.id, type: type.value });

// A listener replaces the link, so the event is a button then.
const hrefFor = (record: TRecord) =>
  hasListener() ? undefined : linkTo(record);
const isSelectable = (record: TRecord) =>
  hasListener() || linkTo(record) !== undefined;

function onSelectEvent(record: TRecord) {
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
    <CalendarHeader
      v-else
      :title="title"
      :view="view"
      :views="available"
      @navigate="onNavigate"
      @view-change="onViewChange"
    />
    <CalendarMonthView
      v-if="view === 'month'"
      :days="days"
      :anchor="anchor"
      :weekdays="weekdays"
      :label="title"
      :events="events"
      :href-for="hrefFor"
      :is-selectable="isSelectable"
      :draggable="hasDropListener()"
      @select-event="onSelectEvent"
      @select-slot="emit('selectSlot', $event)"
      @drop="(record, moved) => emit('drop', record, moved)"
    >
      <template v-if="$slots.event" #event="slotProps">
        <slot name="event" v-bind="slotProps" />
      </template>
    </CalendarMonthView>
    <CalendarWeekView
      v-else-if="view === 'week'"
      :days="days"
      :labels="labels"
      :label="title"
      :events="events"
      :href-for="hrefFor"
      :is-selectable="isSelectable"
      @select-event="onSelectEvent"
      @select-slot="emit('selectSlot', $event)"
    >
      <template v-if="$slots.event" #event="slotProps">
        <slot name="event" v-bind="slotProps" />
      </template>
    </CalendarWeekView>
    <CalendarAgendaView
      v-else
      :range="range"
      :labels="labels"
      :label="title"
      :events="events"
      :href-for="hrefFor"
      :is-selectable="isSelectable"
      @select-event="onSelectEvent"
    >
      <template v-if="$slots.event" #event="slotProps">
        <slot name="event" v-bind="slotProps" />
      </template>
    </CalendarAgendaView>
  </div>
</template>
