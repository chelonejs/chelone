import { DataTable, List, ListToolbar, TextInput } from "@chelone/react";

/** `<ListToolbar>` puts a search filter beside create and export actions. */
export default function ListToolbarDemo() {
  return (
    <List
      perPage={5}
      actions={
        <ListToolbar
          filters={[<TextInput key="q" source="q" label="Search" alwaysOn />]}
        />
      }
    >
      <DataTable rowClick={false}>
        <DataTable.Col source="title" />
        <DataTable.NumberCol source="views" />
      </DataTable>
    </List>
  );
}
