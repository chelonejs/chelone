import { JsonField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** `<JsonField>` displays a post's metadata as indented JSON. */
export default function JsonFieldDemo() {
  return (
    <RecordContextProvider
      value={{
        id: 1,
        metadata: { category: "Computing", tags: ["Science", "History"] },
      }}
    >
      <JsonField source="metadata" />
    </RecordContextProvider>
  );
}
