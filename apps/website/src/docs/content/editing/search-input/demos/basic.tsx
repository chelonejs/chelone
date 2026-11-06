import { DataTable, List, ListToolbar, SearchInput } from "@chelone/react";

/** `<SearchInput>` is the search box in the toolbar above a post list. */
export default function SearchInputDemo() {
  return (
    <List
      perPage={5}
      actions={
        <ListToolbar filters={[<SearchInput key="q" source="q" alwaysOn />]} />
      }
    >
      <DataTable rowClick={false}>
        <DataTable.Col source="title" />
        <DataTable.NumberCol source="views" />
      </DataTable>
    </List>
  );
}
