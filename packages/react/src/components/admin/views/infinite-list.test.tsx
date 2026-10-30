/**
 * `<InfiniteList>`: page 1 renders through a `<DataTable>`, Load more appends
 * the next page, sorting restarts at page 1 on the server, and selection
 * survives loading more. Mounted under the same providers as `<List>`.
 */

import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { DataTable } from "../list/data-table";
import { InfinitePagination } from "../list/infinite-pagination";
import { InfiniteList } from "./infinite-list";

afterEach(cleanup);

const POSTS = [
  { id: 1, title: "Echo" },
  { id: 2, title: "Delta" },
  { id: 3, title: "Charlie" },
  { id: 4, title: "Bravo" },
  { id: 5, title: "Alpha" },
];

function mount(node: ReactNode) {
  const dataProvider = fakeDataProvider({ posts: structuredClone(POSTS) });
  const getList = vi.spyOn(dataProvider, "getList");
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  });
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "ra.page.list": "{name}" }) },
  });
  render(
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
      i18n={i18n}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter>
            <ResourceContextProvider value="posts">
              {node}
            </ResourceContextProvider>
          </MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>,
  );
  return { getList };
}

const page = (
  <InfiniteList perPage={2}>
    <DataTable bulkActionButtons={<span>bulk</span>}>
      <DataTable.Col source="title" />
    </DataTable>
    <InfinitePagination autoLoad={false} />
  </InfiniteList>
);

const rowBoxes = () => screen.getAllByRole("checkbox", { name: "Select row" });
const checked = () =>
  rowBoxes().map((box) => box.getAttribute("aria-checked") === "true");

describe("<InfiniteList>", () => {
  it("loads page 1 and Load more appends page 2 to the DataTable", async () => {
    mount(page);
    expect(await screen.findByText("Echo")).toBeTruthy();
    expect(screen.getByText("Delta")).toBeTruthy();
    expect(screen.queryByText("Charlie")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Charlie")).toBeTruthy();
    expect(screen.getByText("Echo")).toBeTruthy();
    expect(screen.getByText("Bravo")).toBeTruthy();
  });

  it("a column header click sorts on the server and restarts at page 1", async () => {
    const { getList } = mount(page);
    await screen.findByText("Echo");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByText("Charlie");

    fireEvent.click(
      document.querySelector('button[data-field="title"]') as HTMLElement,
    );

    // Server-side ascending order, back on the first page: Echo is gone.
    await waitFor(() => expect(screen.queryByText("Echo")).toBeNull());
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Bravo")).toBeTruthy();
    expect(screen.queryByText("Charlie")).toBeNull();

    const params = getList.mock.calls.at(-1)?.[1];
    expect(params?.pagination).toMatchObject({ page: 1 });
    expect([params?.sort].flat()[0]).toEqual({ field: "title", order: "ASC" });
  });

  it("selected rows stay selected after loading more", async () => {
    mount(page);
    await screen.findByText("Echo");

    fireEvent.click(rowBoxes()[0] as HTMLElement);
    await waitFor(() => expect(checked()).toEqual([true, false]));

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByText("Charlie");

    expect(checked()).toEqual([true, false, false, false]);
  });

  it("select all selects every loaded row", async () => {
    mount(page);
    await screen.findByText("Echo");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByText("Charlie");

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select all rows on this page" }),
    );

    await waitFor(() => expect(checked()).toEqual([true, true, true, true]));
  });
});
