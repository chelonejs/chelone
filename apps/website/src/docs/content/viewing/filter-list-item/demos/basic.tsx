import { DataTable, FilterList, FilterListItem, List } from "@chelone/react";

/** A Published filter that toggles on and off when clicked again. */
export default function FilterListItemDemo() {
  return (
    <List perPage={5}>
      <FilterList label="Publication">
        <FilterListItem label="Published" value={{ published: true }} />
      </FilterList>
      <DataTable>
        <DataTable.Col source="title" />
      </DataTable>
    </List>
  );
}
