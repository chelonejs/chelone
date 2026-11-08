import {
  calendarLabels,
  groupCalendarAgenda,
  type ResourceRecord,
} from "@chelone/core";
import { useMemo } from "react";
import { useLocale, useTranslate } from "../../../i18n-hooks";
import {
  CalendarEventButton,
  type CalendarViewProps,
} from "./calendar-month-view";

type CalendarAgendaViewProps<RecordType extends ResourceRecord> =
  CalendarViewProps<RecordType>;

/** The events of the range as a list: a heading per day, then that day's events, earliest first. @internal */
function CalendarAgendaView<RecordType extends ResourceRecord>({
  range,
  events,
  busy,
  label,
  onSelectEvent,
  eventRenderer,
}: CalendarAgendaViewProps<RecordType>) {
  const translate = useTranslate();
  const locale = useLocale();
  const labels = useMemo(() => calendarLabels(locale), [locale]);
  const time = useMemo(
    () => new Intl.DateTimeFormat(locale, { timeStyle: "short" }),
    [locale],
  );
  const groups = groupCalendarAgenda(events, range);

  return (
    <section
      aria-label={label}
      aria-busy={busy}
      data-slot="calendar-agenda-view"
      data-calendar-view="agenda"
      className="rounded-md border"
    >
      {groups.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
          {translate("chelone.calendar.no_events", { _: "No events" })}
        </p>
      ) : (
        groups.map((group) => (
          <div
            key={group.key}
            data-day={group.key}
            className="border-b px-2 py-2 last:border-b-0"
          >
            <h3 className="text-sm font-medium">
              {labels.agendaDay(group.day)}
            </h3>
            <ul className="mt-1 flex flex-col gap-1">
              {group.events.map((event) => (
                <li
                  key={String(event.record.id)}
                  className="flex items-center gap-2"
                >
                  <time
                    dateTime={event.start.toISOString()}
                    className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground"
                  >
                    {time.format(event.start)}
                  </time>
                  <div className="min-w-0 flex-1">
                    <CalendarEventButton
                      event={event}
                      view="agenda"
                      day={group.day}
                      onSelectEvent={onSelectEvent}
                      eventRenderer={eventRenderer}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

export { CalendarAgendaView, type CalendarAgendaViewProps };
