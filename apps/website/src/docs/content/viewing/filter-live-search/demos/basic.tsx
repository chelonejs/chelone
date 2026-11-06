import { DataTable, FilterLiveSearch, List } from "@chelone/react";

/** A search box that filters posts as the reader types. */
export default function FilterLiveSearchDemo() {
  return (
    <List perPage={5}>
      <FilterLiveSearch placeholder="Search posts" />
      <DataTable>
        <DataTable.Col source="title" />
      </DataTable>
    </List>
  );
}
