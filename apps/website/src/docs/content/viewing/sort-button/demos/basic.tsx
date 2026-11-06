import { DataTable, List, SortButton } from "@chelone/react";

/** A menu that sorts posts by title or view count. */
export default function SortButtonDemo() {
  return (
    <List
      perPage={5}
      actions={
        <SortButton
          fields={["title", "views"]}
          label="Sort by {field} ({order})"
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
