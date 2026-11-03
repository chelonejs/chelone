import {
  type CalendarRange,
  type CalendarView,
  calendarLabels,
} from "@chelone/core";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale, useTranslate } from "../../../i18n-hooks";

type CalendarNavigation = "previous" | "today" | "next";

interface HeaderRendererProps {
  range: CalendarRange;
  anchor: Date;
  view: CalendarView;
  onNavigate: (action: CalendarNavigation) => void;
  onViewChange: (view: CalendarView) => void;
}

interface CalendarHeaderProps extends HeaderRendererProps {
  views: readonly CalendarView[];
  className?: string;
}

/** Previous, Today and Next, the title of the range, and a view switcher while more than one view remains. @internal */
function CalendarHeader({
  range,
  anchor,
  view,
  views,
  onNavigate,
  onViewChange,
  className,
}: CalendarHeaderProps) {
  const translate = useTranslate();
  const locale = useLocale();
  const labels = useMemo(() => calendarLabels(locale), [locale]);
  const viewLabels: Record<CalendarView, string> = {
    month: translate("ra.calendar.view.month", { _: "Month" }),
    week: translate("ra.calendar.view.week", { _: "Week" }),
    agenda: translate("ra.calendar.view.agenda", { _: "Agenda" }),
  };

  return (
    <div
      data-slot="calendar-header"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onNavigate("previous")}
        >
          {translate("ra.calendar.previous", { _: "Previous" })}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onNavigate("today")}
        >
          {translate("ra.calendar.today", { _: "Today" })}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onNavigate("next")}
        >
          {translate("ra.calendar.next", { _: "Next" })}
        </Button>
      </div>
      <h2 className="flex-1 text-lg font-semibold" aria-live="polite">
        {labels.title(view, anchor, range)}
      </h2>
      {views.length > 1 ? (
        <div className="flex items-center gap-1">
          {views.map((name) => (
            <Button
              key={name}
              type="button"
              size="sm"
              variant={name === view ? "default" : "outline"}
              aria-pressed={name === view}
              onClick={() => onViewChange(name)}
            >
              {viewLabels[name]}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export {
  CalendarHeader,
  type CalendarHeaderProps,
  type CalendarNavigation,
  type HeaderRendererProps,
};
