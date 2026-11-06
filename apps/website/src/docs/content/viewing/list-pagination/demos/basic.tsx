import { DataTable, List, ListPagination } from "@chelone/react";

/** `<ListPagination>` pages through posts and changes the number of visible rows. */
export default function ListPaginationDemo() {
  return (
    <List perPage={5}>
      <DataTable rowClick={false}>
        <DataTable.Col source="title" />
      </DataTable>
      <ListPagination rowsPerPageOptions={[5, 10, 25]} />
    </List>
  );
}
