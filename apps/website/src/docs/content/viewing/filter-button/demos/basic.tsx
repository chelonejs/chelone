import {
  DataTable,
  FilterButton,
  FilterForm,
  List,
  TextInput,
} from "@chelone/react";

const filters = [<TextInput key="title" source="title" label="Title" />];

/** An Add filter menu that reveals a title input above the post list. */
export default function FilterButtonDemo() {
  return (
    <List
      perPage={5}
      actions={
        <>
          <FilterForm filters={filters} />
          <FilterButton filters={filters} />
        </>
      }
    >
      <DataTable>
        <DataTable.Col source="title" />
      </DataTable>
    </List>
  );
}
