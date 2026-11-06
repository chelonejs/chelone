import { TimeInput } from "@chelone/react";

export const mode = "input";

/** `<TimeInput>` shows a native time picker set to 09:30. */
export default function TimeInputDemo() {
  return (
    <div className="w-full max-w-sm">
      <TimeInput source="opens_at" defaultValue="09:30" />
    </div>
  );
}
