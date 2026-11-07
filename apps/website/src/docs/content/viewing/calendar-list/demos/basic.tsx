import { CalendarList, List } from "@chelone/react";

/** `<CalendarList>` plots each post on the day of its `publish_at` in a month grid. */
export default function CalendarListDemo() {
  return (
    <List title={false}>
      <CalendarList
        startSource="publish_at"
        titleSource="title"
        linkType={false}
        // The preview's in-memory provider matches filters by equality, so it
        // cannot honour the default range filter; a real backend gets it.
        rangeFilter={() => ({})}
      />
    </List>
  );
}
