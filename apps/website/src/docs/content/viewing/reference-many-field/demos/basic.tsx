import {
  DataTable,
  RecordContextProvider,
  ReferenceManyField,
} from "@chelone/react";

export const mode = "record";

/** `<ReferenceManyField>` lists the posts whose `author_id` points back at this author, one `getManyReference` page at a time. */
export default function ReferenceManyFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, name: "Ada Lovelace" }}>
      <ReferenceManyField
        reference="posts"
        target="author_id"
        sort={{ field: "views", order: "DESC" }}
        perPage={3}
      >
        <DataTable rowClick={false}>
          <DataTable.Col source="title" />
          <DataTable.NumberCol source="views" />
        </DataTable>
      </ReferenceManyField>
    </RecordContextProvider>
  );
}
