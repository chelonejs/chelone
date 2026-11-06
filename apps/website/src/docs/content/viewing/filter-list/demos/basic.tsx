import {
  BooleanField,
  DataTable,
  FilterList,
  FilterListItem,
  List,
} from "@chelone/react";

/** Publication filters that narrow the post list with one click. */
export default function FilterListDemo() {
  return (
    <List perPage={5}>
      <FilterList label="Publication">
        <FilterListItem label="Published" value={{ published: true }} />
        <FilterListItem label="Draft" value={{ published: false }} />
      </FilterList>
      <DataTable>
        <DataTable.Col source="title" />
        <DataTable.Col source="published" field={BooleanField} />
      </DataTable>
    </List>
  );
}
