import { RecordContextProvider, SelectField } from "@chelone/react";

export const mode = "record";

const choices = [
  { id: "draft", name: "Draft" },
  { id: "published", name: "Published" },
  { id: "archived", name: "Archived" },
];

/** `<SelectField>` maps a record's stored `status` to the label of the matching choice. */
export default function SelectFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, status: "published" }}>
      <SelectField source="status" choices={choices} />
    </RecordContextProvider>
  );
}
