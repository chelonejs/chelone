import { DataTable, FilterForm, List, TextInput } from "@chelone/react";

const filters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <TextInput key="title" source="title" label="Title" alwaysOn />,
];

/** A `<List>` whose toolbar holds a `<FilterForm>` with two always-on text filters. */
export default function FilterFormDemo() {
  return (
    <List actions={<FilterForm filters={filters} />}>
      <DataTable>
        <DataTable.Col source="title" />
      </DataTable>
    </List>
  );
}
