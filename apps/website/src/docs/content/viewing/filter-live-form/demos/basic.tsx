import { DataTable, FilterLiveForm, List, TextInput } from "@chelone/react";

/** A title input that filters the post list as the reader types. */
export default function FilterLiveFormDemo() {
  return (
    <List perPage={5}>
      <FilterLiveForm>
        <TextInput source="title" label="Title" />
      </FilterLiveForm>
      <DataTable>
        <DataTable.Col source="title" />
      </DataTable>
    </List>
  );
}
