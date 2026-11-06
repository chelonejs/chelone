import { DataTable, List, ListActions } from "@chelone/react";

/** `<ListActions>` offers create and export buttons above the posts. */
export default function ListActionsDemo() {
  return (
    <List perPage={5} actions={<ListActions />}>
      <DataTable rowClick={false}>
        <DataTable.Col source="title" />
        <DataTable.NumberCol source="views" />
      </DataTable>
    </List>
  );
}
