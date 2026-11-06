import { RecordContextProvider, UsageMeterField } from "@chelone/react";

export const mode = "record";

/** Storage usage displayed as a progress meter against a quota. */
export default function UsageMeterFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, used: 45, limit: 100 }}>
      <UsageMeterField
        source="used"
        limitSource="limit"
        unit="GB"
        className="w-64"
      />
    </RecordContextProvider>
  );
}
