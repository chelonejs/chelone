import { BooleanField, ColumnsButton, DataTable, List } from "@chelone/react";

/** `<ColumnsButton>` lets you show, hide and reorder the post table's columns. */
export default function ColumnsButtonDemo() {
  return (
    <List perPage={5} actions={<ColumnsButton />}>
      <DataTable rowClick={false}>
        <DataTable.Col source="title" />
        <DataTable.NumberCol source="views" />
        <DataTable.Col source="published">
          <BooleanField source="published" />
        </DataTable.Col>
      </DataTable>
    </List>
  );
}
