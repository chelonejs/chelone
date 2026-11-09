/**
 * `/admin/posts` — the loader prefetches the list under the SAME query key the
 * mounted `<List>` will read: `listFetchParams` is the exact `getList` params a
 * list controller starts with (option defaults, then persisted params, then the
 * URL search), so the prefetch is a hit and the list never refetches it.
 */

import { getListOptions, listFetchParams } from "@chelone/core";
import { DataTable, List } from "@chelone/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/posts/")({
  loader: ({ context, location }) =>
    context.queryClient.ensureQueryData(
      getListOptions(
        context,
        "posts",
        listFetchParams(context, "posts", {}, location.searchStr),
      ),
    ),
  component: PostsPage,
});

function PostsPage() {
  return (
    <List resource="posts">
      <DataTable>
        <DataTable.Col source="title" />
        <DataTable.Col source="views" />
      </DataTable>
    </List>
  );
}
