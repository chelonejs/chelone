import {
  BooleanField,
  DataTable,
  FilterList,
  FilterListItem,
  List,
  SavedQueriesList,
} from "@chelone/react";

/** Pick a publication filter, then save it under a name to bring it back with one click. */
export default function SavedQueriesListDemo() {
  return (
    <List perPage={5}>
      <FilterList label="Publication">
        <FilterListItem label="Published" value={{ published: true }} />
        <FilterListItem label="Draft" value={{ published: false }} />
      </FilterList>
      <SavedQueriesList />
      <DataTable rowClick={false}>
        <DataTable.Col source="title" />
        <DataTable.Col source="published" field={BooleanField} />
      </DataTable>
    </List>
  );
}
