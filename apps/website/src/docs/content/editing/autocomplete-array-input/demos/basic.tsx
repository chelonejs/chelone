import { AutocompleteArrayInput, RecordContextProvider } from "@chelone/react";

export const mode = "input";

const record = { id: 1, tags: ["science"] };

/** `<AutocompleteArrayInput>` searches tags and displays selected values as removable badges. */
export default function AutocompleteArrayInputDemo() {
  return (
    <RecordContextProvider value={record}>
      <AutocompleteArrayInput
        source="tags"
        defaultValue={record.tags}
        choices={[
          { id: "science", name: "Science" },
          { id: "computing", name: "Computing" },
          { id: "history", name: "History" },
        ]}
      />
    </RecordContextProvider>
  );
}
