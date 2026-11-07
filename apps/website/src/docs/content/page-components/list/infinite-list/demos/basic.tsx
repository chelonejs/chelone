import {
  DataTable,
  InfiniteList,
  InfinitePagination,
  ReferenceField,
  TextField,
} from "@chelone/react";

/** `<InfiniteList>` over the seeded `posts`: five rows at first, and each press of Load more appends the next five under them. */
export default function InfiniteListDemo() {
  return (
    <div className="w-full">
      <InfiniteList perPage={5} title="Latest posts">
        <DataTable rowClick={false}>
          <DataTable.Col source="title" />
          <DataTable.Col label="Author">
            <ReferenceField source="author_id" reference="authors">
              <TextField source="name" />
            </ReferenceField>
          </DataTable.Col>
          <DataTable.NumberCol source="views" />
        </DataTable>
        <InfinitePagination autoLoad={false} />
      </InfiniteList>
    </div>
  );
}
