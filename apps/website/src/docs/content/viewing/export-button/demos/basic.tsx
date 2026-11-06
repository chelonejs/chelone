import { DataTable, ExportButton, List } from "@chelone/react";

/** A post list with a button that downloads the records as CSV. */
export default function ExportButtonDemo() {
  return (
    <List perPage={5} actions={<ExportButton />}>
      <DataTable>
        <DataTable.Col source="title" />
        <DataTable.NumberCol source="views" />
      </DataTable>
    </List>
  );
}
