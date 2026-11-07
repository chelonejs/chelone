import {
  calendarDayKey,
  calendarEventsInHour,
  type ResourceRecord,
} from "@chelone/core";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import {
  CalendarCellEvents,
  type CalendarSlot,
  type CalendarViewProps,
  isSlotKey,
  useCalendarGrid,
} from "./calendar-month-view";

interface CalendarWeekViewProps<RecordType extends ResourceRecord>
  extends CalendarViewProps<RecordType> {
  onSelectSlot?: (slot: CalendarSlot) => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/** Seven day columns by 24 hour rows. An event shows in the cell of its start hour only. @internal */
function CalendarWeekView<RecordType extends ResourceRecord>({
  range,
  events,
  busy,
  label,
  onSelectEvent,
  onSelectSlot,
  eventRenderer,
}: CalendarWeekViewProps<RecordType>) {
  const { labels, days, todayKey } = useCalendarGrid(range);

  // Built from the date parts, so the 23rd hour ends at the next midnight.
  const at = (day: Date, hour: number) =>
    new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);

  // The hour a spring-forward day skips rolls over into the next one: it has
  // no slot of its own, and would otherwise share the next hour's start.
  const exists = (day: Date, hour: number) => at(day, hour).getHours() === hour;

  const selectSlot = (day: Date, hour: number) =>
    exists(day, hour) &&
    onSelectSlot?.({
      startISO: at(day, hour).toISOString(),
      endISO: at(day, hour + 1).toISOString(),
      allDay: false,
    });

  const onCellKeyDown = (event: KeyboardEvent, day: Date, hour: number) => {
    if (isSlotKey(event)) selectSlot(day, hour);
  };

  return (
    <table
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the ARIA grid pattern, so the hour cells can take focus and be selected.
      role="grid"
      aria-label={label}
      aria-busy={busy}
      data-slot="calendar-week-view"
      data-calendar-view="week"
      className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-md border"
    >
      <thead>
        <tr className="bg-muted/50">
          <td aria-hidden="true" className="w-16 border-b" />
          {days.map((day) => {
            const key = calendarDayKey(day);
            return (
              <th
                key={key}
                scope="col"
                data-day={key}
                data-today={key === todayKey}
                aria-current={key === todayKey ? "date" : undefined}
                className="border-b px-2 py-1 text-center text-xs font-medium text-muted-foreground"
              >
                {labels.weekday(day)} {labels.dayNumber(day)}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="[&_tr:last-child_:is(th,td)]:border-b-0">
        {HOURS.map((hour) => (
          <tr key={hour}>
            <th
              scope="row"
              className="border-b px-2 py-1 text-right align-top text-xs font-normal tabular-nums text-muted-foreground"
            >
              {labels.hour(hour)}
            </th>
            {days.map((day) => {
              const key = calendarDayKey(day);
              return (
                <td
                  key={key}
                  // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a gridcell in the ARIA grid pattern.
                  role="gridcell"
                  data-slot-start={
                    exists(day, hour) ? at(day, hour).toISOString() : undefined
                  }
                  aria-disabled={exists(day, hour) ? undefined : true}
                  data-today={key === todayKey}
                  tabIndex={onSelectSlot && exists(day, hour) ? 0 : undefined}
                  onClick={() => selectSlot(day, hour)}
                  onKeyDown={(event) => onCellKeyDown(event, day, hour)}
                  className={cn(
                    "h-12 border-b border-l p-1 align-top",
                    onSelectSlot && "cursor-pointer",
                  )}
                >
                  <CalendarCellEvents
                    events={calendarEventsInHour(events, day, hour)}
                    view="week"
                    day={day}
                    onSelectEvent={onSelectEvent}
                    eventRenderer={eventRenderer}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export { CalendarWeekView, type CalendarWeekViewProps };
