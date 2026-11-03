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

/** A selected slot: the whole day, from its midnight to the next one. */
interface CalendarSlot {
  startISO: string;
  endISO: string;
  allDay: true;
}

interface CalendarMonthViewProps<RecordType extends ResourceRecord> {
  range: CalendarRange;
  /** Days outside this month are muted. */
  anchor: Date;
  events: readonly CalendarEventInfo<RecordType>[];
  busy: boolean;
  label: string;
  onSelectEvent: (event: CalendarEventInfo<RecordType>) => void;
  onSelectSlot?: (slot: CalendarSlot) => void;
  eventRenderer?: (props: EventRendererProps<RecordType>) => ReactNode;
}

const WEEK = 7;

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
  const locale = useLocale();
  const labels = useMemo(() => calendarLabels(locale), [locale]);
  const days = calendarDays(range);
  const todayKey = calendarDayKey(new Date());
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
    // A key pressed on an event button is that button's, not the cell's.
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectSlot(day);
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
                  <div className="flex h-full flex-col gap-1">
                    <span
                      className={cn(
                        "self-end text-xs",
                        key === todayKey &&
                          "rounded-full bg-primary px-1.5 font-semibold text-primary-foreground",
                      )}
                    >
                      {labels.dayNumber(day)}
                    </span>
                    {calendarEventsOnDay(events, day).map((event) => (
                      <button
                        key={String(event.record.id)}
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
                          eventRenderer({ event, view: "month", day })
                        ) : (
                          <span
                            className={cn(
                              "block truncate rounded px-1.5 py-0.5 text-xs",
                              event.color
                                ? "text-white"
                                : "bg-primary text-primary-foreground",
                            )}
                            style={
                              event.color
                                ? { backgroundColor: event.color }
                                : undefined
                            }
                          >
                            {event.title}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
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
  type CalendarEventInfo,
  CalendarMonthView,
  type CalendarMonthViewProps,
  type CalendarSlot,
  type EventRendererProps,
};
