import { CheckboxGroupInput, RecordContextProvider } from "@chelone/react";

export const mode = "input";

const record = { id: 1, tags: ["science"] };

/** `<CheckboxGroupInput>` selects several tags from a short list of checkboxes. */
export default function CheckboxGroupInputDemo() {
  return (
    <RecordContextProvider value={record}>
      <CheckboxGroupInput
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
