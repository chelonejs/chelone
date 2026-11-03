import {
  type CalendarEvent,
  type CalendarRange,
  type CalendarView,
  calendarDayKey,
  calendarDays,
  calendarEventsOnDay,
  calendarLabels,
  type ResourceRecord,
} from "@chelone/core";
import { type KeyboardEvent, type ReactNode, useMemo } from "react";
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
 * A selected slot: a whole day in the month view, from its midnight to the
 * next one, or one hour in the week view, ending at the next hour's start.
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

interface CalendarMonthViewProps<RecordType extends ResourceRecord>
  extends CalendarViewProps<RecordType> {
  /** Days outside this month are muted. */
  anchor: Date;
  onSelectSlot?: (slot: CalendarSlot) => void;
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
}

/** One event as a button, in a cell of any view. A click on it is not a click on the cell behind. @internal */
function CalendarEventButton<RecordType extends ResourceRecord>({
  event,
  view,
  day,
  onSelectEvent,
  eventRenderer,
}: CalendarEventButtonProps<RecordType>) {
  return (
    <button
      type="button"
      data-color={event.color}
      onClick={(click) => {
        // The cell behind the event is a slot; the event is not.
        click.stopPropagation();
        onSelectEvent(event);
      }}
      className="block w-full cursor-pointer text-left"
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
    "view" | "day" | "onSelectEvent" | "eventRenderer"
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
}: CalendarMonthViewProps<RecordType>) {
  const { labels, days, todayKey } = useCalendarGrid(range);
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += WEEK) {
    weeks.push(days.slice(i, i + WEEK));
  }

  const selectSlot = (day: Date) =>
    onSelectSlot?.({
      startISO: day.toISOString(),
      endISO: new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate() + 1,
      ).toISOString(),
      allDay: true,
    });

  const onCellKeyDown = (event: KeyboardEvent, day: Date) => {
    if (isSlotKey(event)) selectSlot(day);
  };

  return (
    <table
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the ARIA grid pattern, so the day cells can take focus and be selected.
      role="grid"
      aria-label={label}
      aria-busy={busy}
      data-slot="calendar-month-view"
      className="w-full table-fixed border-collapse overflow-hidden rounded-md border"
    >
      <thead>
        <tr className="border-b bg-muted/50">
          {(weeks[0] ?? []).map((day) => (
            <th
              key={calendarDayKey(day)}
              scope="col"
              className="px-2 py-1 text-center text-xs font-medium text-muted-foreground"
            >
              {labels.weekday(day)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr
            key={calendarDayKey(week[0] as Date)}
            className="border-b last:border-b-0"
          >
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
                  className={cn(
                    "h-24 border-r p-1 align-top last:border-r-0",
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
