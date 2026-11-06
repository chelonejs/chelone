import { CronField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** `<CronField>` describes a weekday schedule at 9 AM and shows its cron expression. */
export default function CronFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, schedule: "0 9 * * 1-5" }}>
      <CronField source="schedule" showExpression />
    </RecordContextProvider>
  );
}
