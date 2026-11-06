import { DateTimeInput } from "@chelone/react";

export const mode = "input";

/** `<DateTimeInput>` shows a native date and time picker set to 14 March 2026 at 09:30. */
export default function DateTimeInputDemo() {
  return <DateTimeInput source="starts_at" defaultValue="2026-03-14T09:30" />;
}
