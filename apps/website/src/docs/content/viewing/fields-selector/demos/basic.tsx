import { BooleanField, DataTable, FieldsSelector, List } from "@chelone/react";

const storeKey = "posts.datatable";

/** `<FieldsSelector>` lists the columns the post table publishes under its store key, each with a switch and move buttons. */
export default function FieldsSelectorDemo() {
  return (
    <List perPage={5}>
      {/* Stacked, not side by side: the preview is 590px wide, and a 256px
          selector beside the table leaves the table too narrow to read. */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="min-w-0">
          <DataTable rowClick={false} storeKey={storeKey}>
            <DataTable.Col source="title" />
            <DataTable.NumberCol source="views" />
            <DataTable.Col source="published">
              <BooleanField source="published" />
            </DataTable.Col>
          </DataTable>
        </div>
        <div className="min-w-0 rounded-md border p-4">
          <FieldsSelector storeKey={storeKey} />
        </div>
      </div>
    </List>
  );
}
