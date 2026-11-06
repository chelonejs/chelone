import { CronInput } from "@chelone/react";

export const mode = "input";

/** `<CronInput>` holds `0 9 * * 1-5` and describes the schedule beneath the field. */
export default function CronInputDemo() {
  return <CronInput source="schedule" defaultValue="0 9 * * 1-5" />;
}
