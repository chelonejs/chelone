import { RecordContextProvider, TextArrayField } from "@chelone/react";

export const mode = "record";

/** A post's tags displayed as a row of badges. */
export default function TextArrayFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, tags: ["Science", "Computing"] }}>
      <TextArrayField source="tags" />
    </RecordContextProvider>
  );
}
