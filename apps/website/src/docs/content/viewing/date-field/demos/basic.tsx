import { DateField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** `<DateField>` formats a post's publication date. */
export default function DateFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, published_at: "2026-06-23" }}>
      <DateField source="published_at" />
    </RecordContextProvider>
  );
}
