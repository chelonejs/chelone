import {
  type CalendarRange,
  type CalendarView,
  type CalendarWeekStart,
  type CreatePathType,
  calendarLabels,
  calendarRange,
  calendarRangeFilter,
  DEFAULT_PER_PAGE,
  type LooseRecord,
  type ResourceRecord,
  type SourcePath,
  shiftCalendarAnchor,
  staleCalendarRangeKeys,
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
import { CalendarAgendaView } from "./calendar-agenda-view";
import {
  CalendarHeader,
  type CalendarNavigation,
  type HeaderRendererProps,
} from "./calendar-header";
import {
  type CalendarDropRange,
  type CalendarEventInfo,
  CalendarMonthView,
  type CalendarSlot,
  type EventRendererProps,
} from "./calendar-month-view";
import { CalendarWeekView } from "./calendar-week-view";

const ALL_VIEWS: readonly CalendarView[] = ["month", "week", "agenda"];

interface CalendarListProps<RecordType extends ResourceRecord = LooseRecord> {
  // The sources are `NoInfer`: inferring `RecordType` from a path literal
  // falls back to `ResourceRecord`, whose only path is "id", not to the default.
  /** The field holding an event's start; also the field the default range filter is keyed on. */
  startSource: NoInfer<SourcePath<RecordType>>;
  endSource?: NoInfer<SourcePath<RecordType>>;
  /** The field holding an event's title; the record representation when unset or empty. */
  titleSource?: NoInfer<SourcePath<RecordType>>;
  colorSource?: NoInfer<SourcePath<RecordType>>;
  /** Maps the value at `colorSource` to a CSS color. */
  colorMap?: Record<string, string>;
  /** The view shown first; the first of `views` when it is not among them. @default "month" */
  defaultView?: CalendarView;
  /** The views offered; the switcher is hidden while one remains. @default ["month", "week", "agenda"] */
  views?: readonly CalendarView[];
  /** 0 is Sunday. @default 0 */
  weekStartsOn?: CalendarWeekStart;
  /** Records fetched per range, so a month is not cut off at the list default. @default 1000 */
  perPage?: number;
  /**
   * The list filter for the visible range, for a provider that names its
   * operators otherwise. Default: `<startSource>_gte` and `<startSource>_lte`,
   * or with `endSource` set `<startSource>_lte` and `<endSource>_gte`, which
   * also fetches an event that starts before the range. A record with an empty
   * end is then left out, so such data needs a custom `rangeFilter`.
   */
  rangeFilter?: (range: CalendarRange) => Record<string, unknown>;
  /** Where an event links when `onSelectEvent` is unset: the edit page, else the show page. `false` makes it inert. */
  linkType?: CreatePathType | false;
  onSelectEvent?: (record: RecordType) => void;
  /** An empty part of a day cell was clicked, or Enter or Space pressed on it. */
  onSelectSlot?: (slot: CalendarSlot) => void;
  /**
   * Makes month-view events draggable to another day. Called with the record
   * and its moved ISO `start`, and `end` when the event had one; not called for
   * a drop on the day it came from. The list is not updated here: save, and the
   * list refetches. A rejection is left to the caller. Native drag and drop
   * does not work on touch screens and has no keyboard form, so
   * `onSelectEvent` stays the route to an edit form.
   */
  onDrop?: (
    record: RecordType,
    range: CalendarDropRange,
  ) => Promise<void> | void;
  /** Replaces the coloured block inside each event button. */
  eventRenderer?: (props: EventRendererProps<RecordType>) => ReactNode;
  /** Replaces the header. */
  headerRenderer?: (props: HeaderRendererProps) => ReactNode;
  className?: string;
}

/**
 * The records of the ambient list as events in a month grid, a week of hour
 * rows, or an agenda. It sets the list
 * filter to the visible range and `perPage` to cover it, and takes both back
 * on unmount so a `<DataTable>` of the same resource is not left on one month.
 *
 * @example
 * <List>
 *   <CalendarList startSource="start" endSource="end" titleSource="title" />
 * </List>
 */
function CalendarList<RecordType extends ResourceRecord = LooseRecord>({
  startSource,
  endSource,
  titleSource,
  colorSource,
  colorMap,
  defaultView = "month",
  views = ALL_VIEWS,
  weekStartsOn = 0,
  perPage = 1000,
  rangeFilter,
  linkType,
  onSelectEvent,
  onSelectSlot,
  onDrop,
  eventRenderer,
  headerRenderer,
  className,
}: CalendarListProps<RecordType>) {
  const list = useListContext<RecordType>();
  const resource = useResourceContext();
  const definition = useResourceDefinition();
  const navigate = useNavigate();
  const createPath = useCreatePath();
  const locale = useLocale();
  const getRecordRepresentation = useGetRecordRepresentation(resource);

  const availableViews = useMemo<readonly CalendarView[]>(
    () => (views.length > 0 ? views : ALL_VIEWS),
    [views],
  );
  const [chosenView, setView] = useState<CalendarView>(defaultView);
  const view = availableViews.includes(chosenView)
    ? chosenView
    : (availableViews[0] ?? defaultView);
  const [anchor, setAnchor] = useState(() => new Date());

  const range = useMemo(
    () => calendarRange(view, anchor, weekStartsOn),
    [view, anchor, weekStartsOn],
  );
  const startISO = range.start.toISOString();
  const endISO = range.end.toISOString();

  const rangeValues = () =>
    rangeFilter
      ? rangeFilter(range)
      : calendarRangeFilter<RecordType>(startSource, range, endSource);
  const staleKeys = rangeFilter
    ? []
    : staleCalendarRangeKeys<RecordType>(startSource, endSource);
  const listFilter = list.filter;
  const inSync =
    list.perPage === perPage &&
    staleKeys.every((key) => !(key in listFilter)) &&
    Object.entries(rangeValues()).every(
      ([key, value]) => listFilter[key] === value,
    );

  // What the range effect reads is the latest render's, without being a dependency.
  const latest = useRef({ list, rangeValues, perPage, staleKeys });
  latest.current = { list, rangeValues, perPage, staleKeys };
  const applied = useRef<{
    keys: Set<string>;
    previousPerPage: number;
  } | null>(null);

  // Runs for a new range, and again when the list stops holding it: a user
  // filter form replaces the whole filter, range keys included.
  // biome-ignore lint/correctness/useExhaustiveDependencies(startISO): a new range is the trigger; the range itself is read from `latest`.
  // biome-ignore lint/correctness/useExhaustiveDependencies(endISO): see startISO.
  useEffect(() => {
    const current = latest.current;
    const values = current.rangeValues();
    const filter = { ...current.list.filter };
    for (const key of current.staleKeys) delete filter[key];
    // Recorded even when the list already holds the range, as it does after a
    // reload on a list URL: the unmount still has to take it back.
    applied.current ??= {
      keys: new Set(),
      previousPerPage: current.list.perPage,
    };
    for (const key of Object.keys(values)) applied.current.keys.add(key);
    if (inSync) return;
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
      const filter = { ...current.filter };
      for (const key of before.keys) delete filter[key];
      // A perPage already ours on mount came from a URL this calendar wrote
      // earlier, so the one it replaced is gone: fall back to the list default,
      // even for a <List perPage> that is not 10.
      const { perPage: own } = latest.current;
      current.setParams({
        filter,
        perPage:
          before.previousPerPage === own
            ? (current.defaultPerPage ?? DEFAULT_PER_PAGE)
            : before.previousPerPage,
      });
    },
    [],
  );

  const events = useMemo(
    () =>
      toCalendarEvents<RecordType>(list.data ?? [], {
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

  const viewProps = {
    range,
    events,
    busy: list.isPending,
    label: calendarLabels(locale).title(view, anchor, range),
    onSelectEvent: selectEvent,
    eventRenderer,
  };

  return (
    <div
      data-slot="calendar-list"
      className={cn("flex flex-col gap-3", className)}
    >
      {header}
      {view === "week" ? (
        <CalendarWeekView {...viewProps} onSelectSlot={onSelectSlot} />
      ) : view === "agenda" ? (
        <CalendarAgendaView {...viewProps} />
      ) : (
        <CalendarMonthView<RecordType>
          {...viewProps}
          anchor={anchor}
          onSelectSlot={onSelectSlot}
          onDropEvent={
            onDrop && ((event, moved) => onDrop(event.record, moved))
          }
        />
      )}
    </div>
  );
}

export type { CalendarView };
export {
  type CalendarDropRange,
  type CalendarEventInfo,
  CalendarList,
  type CalendarListProps,
  type EventRendererProps,
  type HeaderRendererProps,
};
