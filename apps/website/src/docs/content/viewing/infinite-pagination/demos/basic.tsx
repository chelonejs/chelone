import { DataTable, InfiniteList, InfinitePagination } from "@chelone/react";

/** `<InfinitePagination>` loads another page of posts on demand. */
export default function InfinitePaginationDemo() {
  return (
    <InfiniteList perPage={5}>
      <DataTable rowClick={false}>
        <DataTable.Col source="title" />
      </DataTable>
      <InfinitePagination autoLoad={false} />
    </InfiniteList>
  );
}
