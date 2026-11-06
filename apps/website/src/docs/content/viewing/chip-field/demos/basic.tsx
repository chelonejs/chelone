import { ChipField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** `<ChipField>` shows a post's category as a compact chip. */
export default function ChipFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, category: "Science" }}>
      <ChipField source="category" />
    </RecordContextProvider>
  );
}
