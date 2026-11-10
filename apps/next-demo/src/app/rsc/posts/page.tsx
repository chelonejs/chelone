/**
 * `/rsc/posts`: the posts list rendered in a React Server Component. The page
 * reads one page from the process-wide provider with the URL's own query
 * string, and `<ServerList>` turns every sort and page into a link to a new
 * URL, so the next state is another server render. `app/rsc/layout.tsx` wraps
 * it in the router adapter, which is what makes those links client
 * navigations.
 *
 * The filter bar is plain data, so it renders here too, as a client island. The
 * row action is a server action passed to the delete button: a server component
 * may hand one down, only never a closure of its own.
 */

import { loadServerListPage, type RecordOf } from "@chelone/core";
import {
  ServerList,
  ServerListDeleteButton,
  ServerListFilters,
} from "@chelone/react/rsc";
import { QueryClient } from "@tanstack/query-core";
import { type NextDemoResources, postSchema } from "../../../resources";
import { deletePost } from "../../../rsc-actions";
import { serverDataProvider } from "../../../server-data";
import { type SearchParams, searchOf } from "../../search-of";

type Post = RecordOf<NextDemoResources, "posts">;

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const page = await loadServerListPage(
    { dataProvider: serverDataProvider, queryClient: new QueryClient() },
    "posts",
    {
      search: searchOf(await searchParams),
      options: { sort: { field: "id", order: "ASC" } },
      references: {},
    },
  );

  return (
    <main>
      <h1>Server list</h1>
      <ServerListFilters<Post>
        path="/rsc/posts"
        params={page.params}
        filters={[
          { source: "title", label: "Title (exact)" },
          {
            source: "status",
            label: "Status",
            choices: postSchema.shape.status.options.map((status) => ({
              id: status,
              name: status,
            })),
          },
        ]}
      />
      <ServerList
        page={page}
        path="/rsc/posts"
        columns={[
          { source: "id", label: "Id", sortable: true },
          { source: "title", label: "Title", sortable: true },
          { source: "views", label: "Views", sortable: true },
          { source: "status", label: "Status" },
        ]}
        rowActions={(post) => (
          <ServerListDeleteButton id={post.id} onDelete={deletePost} />
        )}
      />
    </main>
  );
}
