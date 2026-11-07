import { DataTable, FieldsSelector, List } from "@chelone/react";

const storeKey = "posts.datatable";

/** `<FieldsSelector>` lists the columns the post table publishes under its store key, each with a switch and move buttons. */
export default function FieldsSelectorDemo() {
  return (
    <List perPage={5}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <DataTable rowClick={false} storeKey={storeKey}>
            <DataTable.Col source="title" />
            <DataTable.NumberCol source="views" />
            <DataTable.Col source="body" />
          </DataTable>
        </div>
        <div className="rounded-md border p-4 md:w-64 md:shrink-0">
          <FieldsSelector storeKey={storeKey} />
        </div>
      </div>
    </List>
  );
}
