import {
  ArrayInput,
  RecordContextProvider,
  SimpleFormIterator,
  TextInput,
} from "@chelone/react";

export const mode = "input";

const record = { id: 1, tags: [{ name: "Science" }, { name: "Computing" }] };

/** `<ArrayInput>` edits embedded tags with controls to add, remove, and reorder rows. */
export default function ArrayInputDemo() {
  return (
    <RecordContextProvider value={record}>
      <ArrayInput source="tags" defaultValue={record.tags}>
        <SimpleFormIterator>
          <TextInput source="name" label="Tag" />
        </SimpleFormIterator>
      </ArrayInput>
    </RecordContextProvider>
  );
}
