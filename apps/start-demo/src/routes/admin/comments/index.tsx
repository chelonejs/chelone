/**
 * `/admin/comments` — the same loader shape as the posts list, over the
 * `comments` resource. This is the page the SSR test renders: the rows the
 * loader prefetched are what the server render shows.
 */

import { getListOptions, listFetchParams } from "@chelone/core";
import { DataTable, List } from "@chelone/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/comments/")({
  loader: ({ context, location }) =>
    context.queryClient.ensureQueryData(
      getListOptions(
        context,
        "comments",
        listFetchParams(context, "comments", {}, location.searchStr),
      ),
    ),
  component: CommentsPage,
});

function CommentsPage() {
  return (
    <List resource="comments">
      <DataTable>
        <DataTable.Col source="authorName" />
        <DataTable.Col source="body" />
      </DataTable>
    </List>
  );
}
