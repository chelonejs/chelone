import {
  DataTable,
  FilterButton,
  FilterForm,
  List,
  ListPagination,
  TextInput,
} from "@chelone/react";

// The filter inputs — reused by the always-on FilterForm and the FilterButton
// menu that toggles the optional ones.
const postFilters = [
  <TextInput key="q" source="q" label="Search" alwaysOn />,
  <TextInput key="title" source="title" label="Title" />,
];

/** A `<List>` with a filter bar: an always-on search plus a FilterButton that
 *  reveals the optional `title` filter. Filters write to the list query. */
export default function ListFiltersDemo() {
  return (
    <List
      actions={
        <div className="flex items-center gap-2">
          <FilterForm filters={postFilters} />
          <FilterButton filters={postFilters} />
        </div>
      }
    >
      <DataTable>
        <DataTable.Col source="title" />
        <DataTable.NumberCol source="views" />
      </DataTable>
      <ListPagination />
    </List>
  );
}
