import type { GetListParams } from "@chelone/core";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RouterAdapterProvider } from "../../router/adapter";
import { tanstackHostRouterAdapter } from "../../router/tanstack-router-adapter";
import {
  ServerListFilters,
  type ServerListFiltersProps,
} from "./server-list-filters";

interface Post {
  id: number;
  title: string;
  status: string;
  views: number;
}

afterEach(cleanup);

const settle = () => act(() => new Promise((r) => setTimeout(r, 40)));

/** Mounts the island under a memory-history router and returns the router. */
async function mount(props: Omit<ServerListFiltersProps<Post>, "path">) {
  const rootRoute = createRootRoute({ component: Outlet });
  const postsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts",
    component: () => (
      <RouterAdapterProvider adapter={tanstackHostRouterAdapter}>
        <ServerListFilters<Post> path="/posts" {...props} />
      </RouterAdapterProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([postsRoute]),
    history: createMemoryHistory({ initialEntries: ["/posts"] }),
  });
  await act(async () => {
    render(<RouterProvider router={router} />);
    await new Promise((r) => setTimeout(r, 40));
  });
  return router;
}

const params: GetListParams = {
  pagination: { page: 3, perPage: 5 },
  sort: { field: "title", order: "DESC" },
  filter: { title_like: "ada", status: "draft" },
};

const filters: ServerListFiltersProps<Post>["filters"] = [
  { source: "title_like", label: "Title" },
  {
    source: "status",
    label: "Status",
    choices: [
      { id: "draft", name: "Draft" },
      { id: "published", name: "Published" },
    ],
  },
];

describe("ServerListFilters", () => {
  it("prefills a text input and a select from params.filter", async () => {
    await mount({ params, filters });
    const title = await screen.findByLabelText<HTMLInputElement>("Title");
    expect(title.value).toBe("ada");
    expect(screen.getByLabelText<HTMLSelectElement>("Status").value).toBe(
      "draft",
    );
  });

  it("navigates to page 1 with the new filter and the sort and perPage kept", async () => {
    const router = await mount({ params, filters });
    fireEvent.change(await screen.findByLabelText("Title"), {
      target: { value: "grace" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await settle();

    expect(router.state.location.pathname).toBe("/posts");
    expect(router.state.location.searchStr).toBe(
      `?${new URLSearchParams({
        filter: JSON.stringify({ title_like: "grace", status: "draft" }),
        sort: "title",
        order: "DESC",
        page: "1",
        perPage: "5",
      })}`,
    );
  });

  it("drops the key of a cleared input", async () => {
    const router = await mount({ params, filters });
    fireEvent.change(await screen.findByLabelText("Title"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await settle();

    expect(router.state.location.search).toEqual({
      filter: { status: "draft" },
      sort: "title",
      order: "DESC",
      page: 1,
      perPage: 5,
    });
  });

  it("leaves out the filter param when every filter is cleared", async () => {
    const router = await mount({
      params: { ...params, filter: { title_like: "ada" } },
      filters,
    });
    fireEvent.change(await screen.findByLabelText("Title"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await settle();

    expect(router.state.location.searchStr).not.toContain("filter");
  });

  it("sends the chosen id of a select filter, with the type the choice gave", async () => {
    const router = await mount({
      params: { pagination: { page: 2, perPage: 10 } },
      filters: [
        {
          source: "views",
          label: "Views",
          choices: [
            { id: 0, name: "None" },
            { id: 100, name: "Popular" },
          ],
        },
      ],
    });
    fireEvent.change(await screen.findByLabelText("Views"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await settle();

    expect(router.state.location.search).toEqual({
      filter: { views: 100 },
      page: 1,
      perPage: 10,
    });
  });

  it("keeps a filter the island has no input for", async () => {
    const router = await mount({
      params: { ...params, filter: { title_like: "ada", views_gte: 5 } },
      filters: [{ source: "title_like", label: "Title" }],
    });
    fireEvent.change(await screen.findByLabelText("Title"), {
      target: { value: "bob" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await settle();

    expect(router.state.location.search).toMatchObject({
      filter: { title_like: "bob", views_gte: 5 },
    });
  });
});
