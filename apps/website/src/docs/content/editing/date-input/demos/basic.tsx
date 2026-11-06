import { DateInput } from "@chelone/react";

export const mode = "input";

/** `<DateInput>` shows a native date picker set to 2026-03-14. */
export default function DateInputDemo() {
  return <DateInput source="published_at" defaultValue="2026-03-14" />;
}
