import { DurationField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** A duration of two hours and thirty minutes displayed as `2h 30m`. */
export default function DurationFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, duration: "PT2H30M" }}>
      <DurationField source="duration" />
    </RecordContextProvider>
  );
}
