/**
 * `/rsc/posts`: the posts list, rendered in a React Server Component. The
 * loader hands the route's query string to a server function, which loads one
 * page and its authors from the process-wide provider and returns the list as
 * a composite component. Each sort and page link is a new URL, so a click
 * re-runs the loader and the server renders the next page.
 *
 * The row actions are a client slot: the server leaves a placeholder in each
 * row, and the page fills it here.
 */

import { loadServerListPage } from "@chelone/core";
import { Link as AdminLink, RouterAdapterProvider } from "@chelone/react";
import { ServerList } from "@chelone/react/rsc";
import { tanstackHostRouterAdapter } from "@chelone/react/tanstack-router";
import { QueryClient } from "@tanstack/query-core";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  CompositeComponent,
  createCompositeComponent,
} from "@tanstack/react-start/rsc";
import type { ReactNode } from "react";
import type { z } from "zod";
import type { postSchema } from "../../../resources";
import { serverDataProvider } from "../../../server-data";

type Post = z.infer<typeof postSchema>;

const getPostsList = createServerFn({ method: "GET" })
  .validator((search: string) => search)
  .handler(async ({ data: search }) => {
    const page = await loadServerListPage(
      { dataProvider: serverDataProvider, queryClient: new QueryClient() },
      "posts",
      {
        search,
        options: { sort: { field: "id", order: "ASC" } },
        references: { author_id: "authors" },
      },
    );
    return createCompositeComponent(
      (props: { rowActions: (record: Post) => ReactNode }) => (
        <ServerList
          page={page}
          path="/rsc/posts"
          columns={[
            { source: "id", label: "Id", sortable: true },
            { source: "title", label: "Title", sortable: true },
            {
              source: "author_id",
              label: "Author",
              reference: true,
              representation: "name",
            },
            { source: "views", label: "Views", sortable: true },
            { source: "status", label: "Status" },
          ]}
          rowActions={props.rowActions}
        />
      ),
    );
  });

export const Route = createFileRoute("/rsc/posts/")({
  loaderDeps: ({ search }) => ({ search }),
  loader: ({ location }) => getPostsList({ data: location.searchStr }),
  component: PostsPage,
});

function PostsPage() {
  return (
    <RouterAdapterProvider adapter={tanstackHostRouterAdapter}>
      <main>
        <h1>Server list</h1>
        <CompositeComponent
          src={Route.useLoaderData()}
          rowActions={(post: Post) => (
            <AdminLink to={`/admin/posts/${post.id}`}>Edit</AdminLink>
          )}
        />
      </main>
    </RouterAdapterProvider>
  );
}
