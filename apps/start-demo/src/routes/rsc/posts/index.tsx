/**
 * `/rsc/posts`: the posts list, rendered in a React Server Component. The
 * loader hands the route's query string to a server function, which loads one
 * page and its authors from the process-wide provider and returns the list as
 * a composite component. Each sort and page link is a new URL, so a click
 * re-runs the loader and the server renders the next page.
 *
 * The filter bar renders in the server component too: it is a client island
 * that takes plain data and navigates to the filtered URL. The row actions are
 * a client slot: the server leaves a placeholder in each row, and the page
 * fills it here with an edit link and a delete button that calls a server
 * function and then revalidates the route. `routes/rsc.tsx` provides the router
 * adapter both islands and the list links navigate through.
 */

import { loadServerListPage } from "@chelone/core";
import { Link as AdminLink } from "@chelone/react";
import {
  ServerList,
  ServerListDeleteButton,
  ServerListFilters,
} from "@chelone/react/rsc";
import { QueryClient } from "@tanstack/query-core";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  CompositeComponent,
  createCompositeComponent,
} from "@tanstack/react-start/rsc";
import type { ReactNode } from "react";
import type { z } from "zod";
import { postSchema } from "../../../resources";
import { deletePost, serverDataProvider } from "../../../server-data";

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
    const { data: authors } = await serverDataProvider.getList("authors", {
      sort: { field: "name", order: "ASC" },
    });
    return createCompositeComponent(
      (props: { rowActions: (record: Post) => ReactNode }) => (
        <>
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
              {
                source: "author_id",
                label: "Author",
                choices: authors.map(({ id, name }) => ({
                  id,
                  name: String(name),
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
        </>
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
    <main>
      <h1>Server list</h1>
      <CompositeComponent
        src={Route.useLoaderData()}
        rowActions={(post: Post) => (
          <>
            <AdminLink to={`/admin/posts/${post.id}`}>Edit</AdminLink>
            <ServerListDeleteButton
              id={post.id}
              onDelete={(id) => deletePost({ data: id })}
            />
          </>
        )}
      />
    </main>
  );
}
