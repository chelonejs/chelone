import {
  formatRelativeTime,
  type LooseRecord,
  type SourceProp,
  toTimelineEntries,
} from "@chelone/core";
import { ClockIcon } from "lucide-react";
import { type ComponentType, type ReactNode, useMemo } from "react";
import { useListContext } from "../../../form";
import { useLocale, useTranslate } from "../../../i18n-hooks";
import { cn } from "../../../lib/utils";
import { SimpleListLoading } from "./simple-list-loading";

export interface RecordTimelineProps<
  TRecord extends LooseRecord = LooseRecord,
> {
  /** The field printed as the entry's text; a dotted path reads a nested value. */
  messageSource: SourceProp<TRecord>;
  /** The field holding the entry's date. An invalid or missing date leaves the time out. */
  timestampSource: SourceProp<TRecord>;
  /** The field holding who did it. Without it, or with no value, the entry shows no user. */
  userSource?: SourceProp<TRecord>;
  /** The field whose value picks an entry of `icons`. */
  iconSource?: SourceProp<TRecord>;
  /** Icons by the value of `iconSource`. An entry with no match shows a clock. */
  icons?: Record<string, ComponentType<{ className?: string }>>;
  /** Rendered while the list is pending, in place of `SimpleListLoading`. */
  loading?: ReactNode;
  /** Rendered with no records, in place of the translated "No activity yet". */
  empty?: ReactNode;
  className?: string;
}

/**
 * The records of the ambient list as a dated activity list, one entry per
 * record in list order. It fetches nothing: put it in a `<ReferenceManyField>`
 * or a `<List>`, whose `sort` sets the order. The relative time is computed at
 * render and does not tick while the page stays open.
 *
 * @example
 * <ReferenceManyField
 *   reference="events"
 *   target="post_id"
 *   sort={{ field: "at", order: "DESC" }}
 * >
 *   <RecordTimeline messageSource="message" timestampSource="at" userSource="by" />
 * </ReferenceManyField>
 */
function RecordTimeline<TRecord extends LooseRecord = LooseRecord>({
  messageSource,
  timestampSource,
  userSource,
  iconSource,
  icons,
  loading,
  empty,
  className,
}: RecordTimelineProps<TRecord>) {
  const { data, isPending } = useListContext<TRecord>();
  const translate = useTranslate();
  const locale = useLocale();

  const timeline = useMemo(
    () =>
      toTimelineEntries<LooseRecord>(data ?? [], {
        messageSource,
        timestampSource,
        userSource,
        iconSource,
      }),
    [data, messageSource, timestampSource, userSource, iconSource],
  );

  if (isPending) {
    return loading !== undefined ? (
      loading
    ) : (
      <SimpleListLoading className={className} />
    );
  }
  if (timeline.length === 0) {
    return empty !== undefined ? (
      empty
    ) : (
      <p
        data-slot="record-timeline-empty"
        className={cn("text-sm text-muted-foreground", className)}
      >
        {translate("chelone.record_timeline.empty", { _: "No activity yet" })}
      </p>
    );
  }

  const now = new Date();
  return (
    <ol data-slot="record-timeline" className={cn("flex flex-col", className)}>
      {timeline.map((entry) => {
        // Own keys only: "constructor" or "valueOf" would find Object's.
        const Icon =
          (entry.icon !== undefined &&
            icons !== undefined &&
            Object.hasOwn(icons, entry.icon) &&
            icons[entry.icon]) ||
          ClockIcon;
        return (
          <li
            key={entry.id}
            data-slot="record-timeline-entry"
            data-entry-id={entry.id}
            className="flex gap-3 py-2"
          >
            <span aria-hidden="true" className="mt-0.5 shrink-0">
              <Icon className="size-4 text-muted-foreground" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm">{entry.message}</span>
              <span className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                {entry.user !== undefined ? (
                  <span data-slot="record-timeline-user">{entry.user}</span>
                ) : null}
                {entry.date ? (
                  <time
                    dateTime={entry.date.toISOString()}
                    title={entry.date.toLocaleString(locale)}
                  >
                    {formatRelativeTime(entry.date, now, locale)}
                  </time>
                ) : null}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export { RecordTimeline };
