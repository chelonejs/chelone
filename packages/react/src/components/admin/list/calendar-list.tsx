import {
  type CalendarRange,
  type CalendarView,
  type CalendarWeekStart,
  type CreatePathType,
  calendarLabels,
  calendarRange,
  calendarRangeFilter,
  type ResourceRecord,
  shiftCalendarAnchor,
  toCalendarEvents,
} from "@chelone/core";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useListContext } from "../../../form";
import { useLocale } from "../../../i18n-hooks";
import { useGetRecordRepresentation } from "../../../label";
import { useResourceContext, useResourceDefinition } from "../../../resource";
import { useCreatePath, useNavigate } from "../../../router";
import { useEvent } from "../../../util/use-event";
import {
  CalendarHeader,
  type CalendarNavigation,
  type HeaderRendererProps,
} from "./calendar-header";
import {
  type CalendarEventInfo,
  CalendarMonthView,
  type CalendarSlot,
  type EventRendererProps,
} from "./calendar-month-view";

interface CalendarListProps<
  RecordType extends ResourceRecord = ResourceRecord,
> {
  /** The field holding an event's start; also the field the default range filter is keyed on. */
  startSource: string;
  endSource?: string;
  /** The field holding an event's title; the record representation when unset or empty. */
  titleSource?: string;
  colorSource?: string;
  /** Maps the value at `colorSource` to a CSS color. */
  colorMap?: Record<string, string>;
  /** The view shown first. Only `month` exists yet. */
  defaultView?: CalendarView;
  /** The views offered; the switcher is hidden while one remains. Only `month` exists yet. */
  views?: readonly CalendarView[];
  /** 0 is Sunday. @default 0 */
  weekStartsOn?: CalendarWeekStart;
  /** Records fetched per range, so a month is not cut off at the list default. @default 1000 */
  perPage?: number;
  /**
   * The list filter for the visible range, for a provider that names its
   * operators otherwise. Default: `<startSource>_gte` and `<startSource>_lte`.
   */
  rangeFilter?: (range: CalendarRange) => Record<string, unknown>;
  /** Where an event links when `onSelectEvent` is unset: the edit page, else the show page. `false` makes it inert. */
  linkType?: CreatePathType | false;
  onSelectEvent?: (record: RecordType) => void;
  /** An empty part of a day cell was clicked, or Enter or Space pressed on it. */
  onSelectSlot?: (slot: CalendarSlot) => void;
  /** Replaces the coloured block inside each event button. */
  eventRenderer?: (props: EventRendererProps<RecordType>) => ReactNode;
  /** Replaces the header. */
  headerRenderer?: (props: HeaderRendererProps) => ReactNode;
  className?: string;
}

/**
 * The records of the ambient list as events in a month grid. It sets the list
 * filter to the visible range and `perPage` to cover it, and takes both back
 * on unmount so a `<DataTable>` of the same resource is not left on one month.
 *
 * @example
 * <List>
 *   <CalendarList startSource="start" endSource="end" titleSource="title" />
 * </List>
 */
function CalendarList<RecordType extends ResourceRecord = ResourceRecord>({
  startSource,
  endSource,
  titleSource,
  colorSource,
  colorMap,
  defaultView = "month",
  views = ["month"],
  weekStartsOn = 0,
  perPage = 1000,
  rangeFilter,
  linkType,
  onSelectEvent,
  onSelectSlot,
  eventRenderer,
  headerRenderer,
  className,
}: CalendarListProps<RecordType>) {
  const list = useListContext();
  const resource = useResourceContext();
  const definition = useResourceDefinition();
  const navigate = useNavigate();
  const createPath = useCreatePath();
  const locale = useLocale();
  const getRecordRepresentation = useGetRecordRepresentation(resource);

  // Only the month view exists in this slice.
  const availableViews = useMemo<CalendarView[]>(() => {
    const month = views.filter((name) => name === "month");
    return month.length > 0 ? month : ["month"];
  }, [views]);
  const [chosenView, setView] = useState<CalendarView>(defaultView);
  const view = availableViews.includes(chosenView)
    ? chosenView
    : (availableViews[0] as CalendarView);
  const [anchor, setAnchor] = useState(() => new Date());

  const range = useMemo(
    () => calendarRange(view, anchor, weekStartsOn),
    [view, anchor, weekStartsOn],
  );
  const startISO = range.start.toISOString();
  const endISO = range.end.toISOString();

  const rangeValues = () =>
    rangeFilter ? rangeFilter(range) : calendarRangeFilter(startSource, range);
  const listFilter = list.filter as Record<string, unknown>;
  const inSync =
    list.perPage === perPage &&
    Object.entries(rangeValues()).every(
      ([key, value]) => listFilter[key] === value,
    );

  // What the range effect reads is the latest render's, without being a dependency.
  const latest = useRef({ list, rangeValues, perPage });
  latest.current = { list, rangeValues, perPage };
  const applied = useRef<{
    keys: Set<string>;
    previousPerPage: number;
  } | null>(null);

  // Runs for a new range, and again when the list stops holding it: a user
  // filter form replaces the whole filter, range keys included.
  // biome-ignore lint/correctness/useExhaustiveDependencies(startISO): a new range is the trigger; the range itself is read from `latest`.
  // biome-ignore lint/correctness/useExhaustiveDependencies(endISO): see startISO.
  useEffect(() => {
    if (inSync) return;
    const current = latest.current;
    const values = current.rangeValues();
    const filter = current.list.filter as Record<string, unknown>;
    applied.current ??= {
      keys: new Set(),
      previousPerPage: current.list.perPage,
    };
    for (const key of Object.keys(values)) applied.current.keys.add(key);
    current.list.setParams({
      filter: { ...filter, ...values },
      perPage: current.perPage,
    });
  }, [startISO, endISO, inSync]);

  useEffect(
    () => () => {
      const before = applied.current;
      if (!before) return;
      applied.current = null;
      const { list: current } = latest.current;
      const filter = { ...(current.filter as Record<string, unknown>) };
      for (const key of before.keys) delete filter[key];
      current.setParams({ filter, perPage: before.previousPerPage });
    },
    [],
  );

  const events = useMemo(
    () =>
      toCalendarEvents((list.data ?? []) as RecordType[], {
        startSource,
        endSource,
        titleSource,
        colorSource,
        colorMap,
        getTitle: (record) => {
          const representation = getRecordRepresentation(record);
          // A representation can be an element; the title is text, so fall back to the id.
          return typeof representation === "string" ||
            typeof representation === "number"
            ? String(representation)
            : String(record.id);
        },
      }),
    [
      list.data,
      startSource,
      endSource,
      titleSource,
      colorSource,
      colorMap,
      getRecordRepresentation,
    ],
  );

  const onNavigate = useEvent((action: CalendarNavigation) => {
    setAnchor((current) =>
      action === "today"
        ? new Date()
        : shiftCalendarAnchor(view, current, action === "next" ? 1 : -1),
    );
  });

  const selectEvent = (event: CalendarEventInfo<RecordType>) => {
    if (onSelectEvent) {
      onSelectEvent(event.record);
      return;
    }
    const type =
      linkType ??
      (definition.hasEdit ? "edit" : definition.hasShow ? "show" : false);
    if (type === false || !resource) return;
    navigate(createPath({ type, resource, id: event.record.id }), {
      state: { _scrollToTop: true },
    });
  };

  const header = headerRenderer ? (
    headerRenderer({
      range,
      anchor,
      view,
      onNavigate,
      onViewChange: setView,
    })
  ) : (
    <CalendarHeader
      range={range}
      anchor={anchor}
      view={view}
      views={availableViews}
      onNavigate={onNavigate}
      onViewChange={setView}
    />
  );

  return (
    <div
      data-slot="calendar-list"
      className={cn("flex flex-col gap-3", className)}
    >
      {header}
      <CalendarMonthView
        range={range}
        anchor={anchor}
        events={events}
        busy={list.isPending}
        label={calendarLabels(locale).title(view, anchor, range)}
        onSelectEvent={selectEvent}
        onSelectSlot={onSelectSlot}
        eventRenderer={eventRenderer}
      />
    </div>
  );
}

export type { CalendarView };
export {
  type CalendarEventInfo,
  CalendarList,
  type CalendarListProps,
  type EventRendererProps,
  type HeaderRendererProps,
};
