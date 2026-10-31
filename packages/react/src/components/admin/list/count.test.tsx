/**
 * `<Count>`: the total of a resource, read from a one-row `getList` page.
 * Mounted over a seeded `fakeDataProvider` with a spy on `getList`; stubs
 * where a case needs a rejection, a pending read or a missing `total`.
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
import { Count, type CountProps } from "./count";

afterEach(cleanup);

const posts = [
  { id: 1, title: "Alpha", status: "draft" },
  { id: 2, title: "Beta", status: "published" },
  { id: 3, title: "Gamma", status: "draft" },
];

function mount(
  props: CountProps = { resource: "posts" },
  {
    wrapper,
    setup,
  }: {
    wrapper?: (children: ReactNode) => ReactNode;
    setup?: (getList: ReturnType<typeof vi.spyOn>) => void;
  } = {},
) {
  const dataProvider = fakeDataProvider({ posts: structuredClone(posts) });
  const getList = vi.spyOn(dataProvider, "getList");
  setup?.(getList);
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  });
  const count = <Count {...props} />;
  const result = render(
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
      i18n={createI18n({
        locale: "en",
        messages: { en: defineMessages({}) },
      })}
    >
      <ResourceRegistryProvider registry={registry}>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter>{wrapper ? wrapper(count) : count}</MemoryRouter>
        </RouterAdapterProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>,
  );
  return { ...result, getList };
}

describe("<Count>", () => {
  it("shows the total from a one-row getList page", async () => {
    const { getList } = mount();
    expect(await screen.findByText("3")).toBeTruthy();
    expect(getList).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({ pagination: { page: 1, perPage: 1 } }),
    );
  });

  it("passes filter and sort to getList", async () => {
    const { getList } = mount({
      resource: "posts",
      filter: { status: "draft" },
      sort: { field: "title", order: "DESC" },
    });
    expect(await screen.findByText("2")).toBeTruthy();
    expect(getList).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({
        filter: { status: "draft" },
        sort: { field: "title", order: "DESC" },
      }),
    );
  });

  it("renders 0 for an empty total and nothing for a missing total", async () => {
    const empty = mount({ resource: "posts", filter: { status: "none" } });
    expect(await screen.findByText("0")).toBeTruthy();
    empty.unmount();

    const missing = mount(
      { resource: "posts" },
      {
        setup: (getList) => {
          getList.mockResolvedValue({ data: [] } as never);
        },
      },
    );
    await waitFor(() => expect(missing.getList).toHaveBeenCalled());
    await missing.getList.mock.results[0]?.value;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(missing.container.textContent).toBe("");
  });

  it("shows a spinner only after the timeout while pending", async () => {
    mount(
      { resource: "posts", timeout: 100 },
      {
        setup: (getList) => {
          getList.mockReturnValue(new Promise(() => {}) as never);
        },
      },
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(await screen.findByRole("status")).toBeTruthy();
  });

  it("shows a labelled error icon when getList fails", async () => {
    mount(
      { resource: "posts" },
      {
        setup: (getList) => {
          getList.mockRejectedValue(new Error("boom"));
        },
      },
    );
    expect(await screen.findByRole("img", { name: "Error" })).toBeTruthy();
  });

  it("link goes to the list with the filter encoded in the search", async () => {
    mount({ resource: "posts", filter: { status: "draft" }, link: true });
    const link = await screen.findByRole("link", { name: "2" });
    const href = link.getAttribute("href") ?? "";
    const [path, search] = href.split("?");
    expect(path).toBe("/posts");
    expect(JSON.parse(new URLSearchParams(search).get("filter") ?? "")).toEqual(
      { status: "draft" },
    );
  });

  it("clicking the link does not reach a parent click handler", async () => {
    const onRowClick = vi.fn();
    mount(
      { resource: "posts", link: true },
      {
        wrapper: (count) => (
          // biome-ignore lint/a11y/useKeyWithClickEvents: a stand-in for a clickable row
          // biome-ignore lint/a11y/noStaticElementInteractions: a stand-in for a clickable row
          <div onClick={onRowClick}>{count}</div>
        ),
      },
    );
    fireEvent.click(await screen.findByRole("link", { name: "3" }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("throws without a resource", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => mount({})).toThrow(/resource/);
    spy.mockRestore();
  });
});
