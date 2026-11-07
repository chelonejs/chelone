import {
  type CalendarEvent,
  type CalendarRange,
  type CalendarView,
  calendarDayKey,
  calendarDaySlot,
  calendarDays,
  calendarEventsOnDay,
  calendarLabels,
  moveCalendarEvent,
  type ResourceRecord,
} from "@chelone/core";
import {
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { useLocale } from "../../../i18n-hooks";

type CalendarEventInfo<RecordType extends ResourceRecord = ResourceRecord> =
  CalendarEvent<RecordType>;

interface EventRendererProps<
  RecordType extends ResourceRecord = ResourceRecord,
> {
  event: CalendarEventInfo<RecordType>;
  view: CalendarView;
  /** The day cell the event is drawn in; a multi-day event renders once per day. */
  day: Date;
}

/**
 * A selected slot: a whole day in the month view, from its midnight to its last
 * millisecond as `calendarDaySlot` gives it, or one hour in the week view,
 * ending at the next hour's start.
 */
interface CalendarSlot {
  startISO: string;
  endISO: string;
  allDay: boolean;
}

/** What every view takes. */
interface CalendarViewProps<RecordType extends ResourceRecord> {
  range: CalendarRange;
  events: readonly CalendarEventInfo<RecordType>[];
  busy: boolean;
  label: string;
  onSelectEvent: (event: CalendarEventInfo<RecordType>) => void;
  eventRenderer?: (props: EventRendererProps<RecordType>) => ReactNode;
}

/** The new time span of a dragged event, as ISO strings. */
interface CalendarDropRange {
  start: string;
  end?: string;
}

interface CalendarMonthViewProps<RecordType extends ResourceRecord>
  extends CalendarViewProps<RecordType> {
  /** Days outside this month are muted. */
  anchor: Date;
  onSelectSlot?: (slot: CalendarSlot) => void;
  /** Makes events draggable to another day. */
  onDropEvent?: (
    event: CalendarEventInfo<RecordType>,
    range: CalendarDropRange,
  ) => void;
}

const WEEK = 7;

/** Enter or Space on the cell itself selects its slot; a key pressed on an event button in it is that button's. @internal */
function isSlotKey(event: KeyboardEvent): boolean {
  if (event.target !== event.currentTarget) return false;
  if (event.key !== "Enter" && event.key !== " ") return false;
  event.preventDefault();
  return true;
}

interface CalendarEventButtonProps<RecordType extends ResourceRecord> {
  event: CalendarEventInfo<RecordType>;
  view: CalendarView;
  day: Date;
  onSelectEvent: (event: CalendarEventInfo<RecordType>) => void;
  eventRenderer?: (props: EventRendererProps<RecordType>) => ReactNode;
  /** Set in the month view with `onDrop`: the button becomes draggable. */
  drag?: {
    isDragging: (event: CalendarEventInfo<RecordType>, day: Date) => boolean;
    onDragStart: (
      event: DragEvent,
      calendarEvent: CalendarEventInfo<RecordType>,
      day: Date,
    ) => void;
    onDragEnd: () => void;
  };
}

/** One event as a button, in a cell of any view. A click on it is not a click on the cell behind. @internal */
function CalendarEventButton<RecordType extends ResourceRecord>({
  event,
  view,
  day,
  onSelectEvent,
  eventRenderer,
  drag,
}: CalendarEventButtonProps<RecordType>) {
  const dragging = drag?.isDragging(event, day) ?? false;
  return (
    <button
      type="button"
      data-color={event.color}
      draggable={drag ? true : undefined}
      data-dragging={dragging ? "" : undefined}
      onDragStart={drag && ((e) => drag.onDragStart(e, event, day))}
      onDragEnd={drag?.onDragEnd}
      onClick={(click) => {
        // The cell behind the event is a slot; the event is not.
        click.stopPropagation();
        onSelectEvent(event);
      }}
      className={cn(
        "block w-full cursor-pointer text-left",
        dragging && "opacity-50",
      )}
    >
      {eventRenderer ? (
        eventRenderer({ event, view, day })
      ) : (
        <span
          className={cn(
            "block truncate rounded px-1.5 py-0.5 text-xs",
            event.color ? "text-white" : "bg-primary text-primary-foreground",
          )}
          style={event.color ? { backgroundColor: event.color } : undefined}
        >
          {event.title}
        </span>
      )}
    </button>
  );
}

interface CalendarCellEventsProps<RecordType extends ResourceRecord>
  extends Pick<
    CalendarEventButtonProps<RecordType>,
    "view" | "day" | "onSelectEvent" | "eventRenderer" | "drag"
  > {
  events: readonly CalendarEventInfo<RecordType>[];
  /** Drawn above the events. */
  children?: ReactNode;
}

/** The content of a cell: what `children` holds, then one button per event. @internal */
function CalendarCellEvents<RecordType extends ResourceRecord>({
  events,
  children,
  ...rest
}: CalendarCellEventsProps<RecordType>) {
  return (
    <div className="flex h-full flex-col gap-1">
      {children}
      {events.map((event) => (
        <CalendarEventButton
          key={String(event.record.id)}
          event={event}
          {...rest}
        />
      ))}
    </div>
  );
}

/** The labels, the days of the range and today's key, which the grid views share. @internal */
function useCalendarGrid(range: CalendarRange) {
  const locale = useLocale();
  const labels = useMemo(() => calendarLabels(locale), [locale]);
  return {
    labels,
    days: calendarDays(range),
    todayKey: calendarDayKey(new Date()),
  };
}

/** The whole weeks of a month as a grid: a weekday row, then one cell per day. @internal */
function CalendarMonthView<RecordType extends ResourceRecord>({
  range,
  anchor,
  events,
  busy,
  label,
  onSelectEvent,
  onSelectSlot,
  eventRenderer,
  onDropEvent,
}: CalendarMonthViewProps<RecordType>) {
  const { labels, days, todayKey } = useCalendarGrid(range);
  const weeks: [Date, ...Date[]][] = [];
  for (let i = 0; i < days.length; i += WEEK) {
    const first = days[i];
    if (first !== undefined)
      weeks.push([first, ...days.slice(i + 1, i + WEEK)]);
  }

  const selectSlot = (day: Date) => onSelectSlot?.(calendarDaySlot(day));

  const onCellKeyDown = (event: KeyboardEvent, day: Date) => {
    if (isSlotKey(event)) selectSlot(day);
  };

  // `dataTransfer.getData` is empty during `dragover`, so the grabbed event and
  // the cell it came from are kept here: a multi-day event shows in several
  // cells, and the move is measured from that one.
  const grabbed = useRef<{
    event: CalendarEventInfo<RecordType>;
    from: Date;
  } | null>(null);
  const [draggingKey, setDraggingKey] = useState<string>();
  const [overKey, setOverKey] = useState<string>();

  const clearDrag = () => {
    grabbed.current = null;
    setDraggingKey(undefined);
    setOverKey(undefined);
  };

  const drag = onDropEvent && {
    isDragging: (event: CalendarEventInfo<RecordType>, day: Date) =>
      draggingKey === `${event.record.id}@${calendarDayKey(day)}`,
    onDragStart: (
      e: DragEvent,
      event: CalendarEventInfo<RecordType>,
      from: Date,
    ) => {
      e.dataTransfer.effectAllowed = "move";
      // Firefox starts no drag without data.
      e.dataTransfer.setData("text/plain", String(event.record.id));
      grabbed.current = { event, from };
      setDraggingKey(`${event.record.id}@${calendarDayKey(from)}`);
    },
    onDragEnd: clearDrag,
  };

  const cellDragProps = (day: Date) => {
    if (!onDropEvent) return {};
    const key = calendarDayKey(day);
    return {
      "data-over": overKey === key ? "" : undefined,
      onDragOver: (e: DragEvent) => {
        if (!grabbed.current) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOverKey(key);
      },
      onDragLeave: (e: DragEvent) => {
        // Moving onto a child of the cell fires dragleave on the cell first.
        const into = e.relatedTarget;
        if (into instanceof Node && e.currentTarget.contains(into)) return;
        setOverKey((current) => (current === key ? undefined : current));
      },
      onDrop: (e: DragEvent) => {
        const current = grabbed.current;
        if (!current) return;
        e.preventDefault();
        clearDrag();
        if (key === calendarDayKey(current.from)) return;
        const moved = moveCalendarEvent(current.event, current.from, day);
        onDropEvent(current.event, {
          start: moved.start.toISOString(),
          ...(moved.end ? { end: moved.end.toISOString() } : {}),
        });
      },
    };
  };

  return (
    <table
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the ARIA grid pattern, so the day cells can take focus and be selected.
      role="grid"
      aria-label={label}
      aria-busy={busy}
      data-slot="calendar-month-view"
      className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-md border"
    >
      <thead>
        <tr className="bg-muted/50">
          {(weeks[0] ?? []).map((day) => (
            <th
              key={calendarDayKey(day)}
              scope="col"
              className="border-b px-2 py-1 text-center text-xs font-medium text-muted-foreground"
            >
              {labels.weekday(day)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="[&_tr:last-child_td]:border-b-0">
        {weeks.map((week) => (
          <tr key={calendarDayKey(week[0])}>
            {week.map((day) => {
              const key = calendarDayKey(day);
              const outside = day.getMonth() !== anchor.getMonth();
              return (
                <td
                  key={key}
                  // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a gridcell in the ARIA grid pattern.
                  role="gridcell"
                  data-day={key}
                  data-today={key === todayKey}
                  tabIndex={onSelectSlot ? 0 : undefined}
                  onClick={() => selectSlot(day)}
                  onKeyDown={(event) => onCellKeyDown(event, day)}
                  {...cellDragProps(day)}
                  className={cn(
                    "h-24 border-b border-r p-1 align-top last:border-r-0",
                    outside && "bg-muted/30 text-muted-foreground",
                    onSelectSlot && "cursor-pointer",
                  )}
                >
                  <CalendarCellEvents
                    events={calendarEventsOnDay(events, day)}
                    view="month"
                    day={day}
                    onSelectEvent={onSelectEvent}
                    eventRenderer={eventRenderer}
                    drag={drag}
                  >
                    <span
                      className={cn(
                        "self-end text-xs",
                        key === todayKey &&
                          "rounded-full bg-primary px-1.5 font-semibold text-primary-foreground",
                      )}
                    >
                      {labels.dayNumber(day)}
                    </span>
                  </CalendarCellEvents>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export {
  CalendarCellEvents,
  type CalendarDropRange,
  CalendarEventButton,
  type CalendarEventInfo,
  CalendarMonthView,
  type CalendarMonthViewProps,
  type CalendarSlot,
  type CalendarViewProps,
  type EventRendererProps,
  isSlotKey,
  useCalendarGrid,
};
