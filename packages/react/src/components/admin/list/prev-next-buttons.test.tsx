/**
 * `<PrevNextButtons>`: step through the records of the list a record came
 * from. Mounted as part of an `<Edit>` route under `<Admin>`, over a seeded
 * `fakeDataProvider` with a spy on `getList`. The list's params are persisted
 * in the store under `posts.listParams`, as a `<List>` leaves them.
 */
import {
  type CheloneStore,
  createI18n,
  createStore,
  defineMessages,
  fakeDataProvider,
  getListOptions,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Admin } from "../../../admin";
import { Resource } from "../../../resource";
import { Edit } from "../views/edit";
import {
  PrevNextButtons,
  type PrevNextButtonsProps,
} from "./prev-next-buttons";

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

afterEach(cleanup);

const posts = [
  { id: 1, title: "Alpha", status: "published" },
  { id: 2, title: "Beta", status: "published" },
  { id: 3, title: "Gamma", status: "draft" },
  { id: 4, title: "Delta", status: "published" },
  { id: 5, title: "Epsilon", status: "published" },
];

const i18n = createI18n({
  locale: "en",
  messages: { en: defineMessages({}) },
});

/** The params a `<List>` persists: title descending, published only. */
const listParams = {
  page: 1,
  perPage: 10,
  sort: [{ field: "title", order: "DESC" }],
  filter: { status: "published" },
};

function mount({
  id,
  props,
  stored = listParams,
}: {
  id: number;
  props?: PrevNextButtonsProps;
  /** `null` leaves the list never opened: nothing persisted. */
  stored?: object | null;
}) {
  const dataProvider = fakeDataProvider({ posts: structuredClone(posts) });
  const getList = vi.spyOn(dataProvider, "getList");
  const store: CheloneStore = createStore();
  if (stored !== null) store.setItem("posts.listParams", stored);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const PostEdit = () => (
    <Edit>
      <PrevNextButtons {...props} />
    </Edit>
  );
  const result = render(
    <MemoryRouter initialEntries={[`/posts/${id}`]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={queryClient}
        store={store}
        i18n={i18n}
      >
        <Resource name="posts" edit={PostEdit} />
      </Admin>
    </MemoryRouter>,
  );
  return { ...result, getList, queryClient };
}

const hrefOf = (name: string) =>
  screen.getByRole("link", { name }).getAttribute("href");

describe("<PrevNextButtons>", () => {
  it("links to the previous and next record in the list sort and filter", async () => {
    const { getList } = mount({ id: 4 });
    // title DESC over the published posts: Epsilon(5), Delta(4), Beta(2), Alpha(1)
    expect(await screen.findByRole("link", { name: "Previous" })).toBeTruthy();
    expect(hrefOf("Previous")).toBe("/posts/5");
    expect(hrefOf("Next")).toBe("/posts/2");
    expect(getList).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({
        sort: { field: "title", order: "DESC" },
        filter: { status: "published" },
      }),
    );
  });

  it("shows the position out of the total", async () => {
    mount({ id: 4 });
    const nav = await screen.findByRole("navigation");
    expect(within(nav).getByText("2 / 4")).toBeTruthy();
  });

  it("disables previous on the first record and next on the last", async () => {
    const first = mount({ id: 5 });
    const previous = await screen.findByRole("button", { name: "Previous" });
    expect((previous as HTMLButtonElement).disabled).toBe(true);
    expect(hrefOf("Next")).toBe("/posts/4");
    first.unmount();

    mount({ id: 1 });
    const next = await screen.findByRole("button", { name: "Next" });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    expect(hrefOf("Previous")).toBe("/posts/2");
  });

  it("reads the list page from the query cache without calling getList", async () => {
    const dataProvider = fakeDataProvider({ posts: structuredClone(posts) });
    const getList = vi.spyOn(dataProvider, "getList");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const store = createStore();
    store.setItem("posts.listParams", { ...listParams, filter: {} });
    // The page the list showed, in an order the provider would not return.
    queryClient.setQueryData(
      getListOptions({ dataProvider, queryClient }, "posts", {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "title", order: "DESC" },
        filter: {},
      }).queryKey,
      { data: [posts[2], posts[1], posts[0]], total: 3 },
    );
    const PostEdit = () => (
      <Edit>
        <PrevNextButtons />
      </Edit>
    );
    render(
      <MemoryRouter initialEntries={["/posts/2"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={queryClient}
          store={store}
          i18n={i18n}
        >
          <Resource name="posts" edit={PostEdit} />
        </Admin>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("link", { name: "Previous" })).toBeTruthy();
    expect(hrefOf("Previous")).toBe("/posts/3");
    expect(hrefOf("Next")).toBe("/posts/1");
    expect(getList).not.toHaveBeenCalled();
  });

  it("fetches the first limit rows when the list was never opened", async () => {
    const { getList } = mount({ id: 2, props: { limit: 3 }, stored: null });
    expect(await screen.findByRole("link", { name: "Previous" })).toBeTruthy();
    expect(getList).toHaveBeenCalledTimes(1);
    expect(getList).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({
        pagination: { page: 1, perPage: 3 },
        sort: { field: "id", order: "ASC" },
      }),
    );
    expect(hrefOf("Previous")).toBe("/posts/1");
    expect(hrefOf("Next")).toBe("/posts/3");
  });

  it("linkType show builds show paths", async () => {
    mount({ id: 4, props: { linkType: "show" } });
    expect(await screen.findByRole("link", { name: "Previous" })).toBeTruthy();
    expect(hrefOf("Previous")).toBe("/posts/5/show");
    expect(hrefOf("Next")).toBe("/posts/2/show");
  });

  it("shows a skeleton while pending and a labelled error icon when getList fails", async () => {
    const dataProvider = fakeDataProvider({ posts: structuredClone(posts) });
    vi.spyOn(dataProvider, "getList").mockRejectedValue(new Error("boom"));
    const PostEdit = () => (
      <Edit>
        <PrevNextButtons />
      </Edit>
    );
    const { container } = render(
      <MemoryRouter initialEntries={["/posts/2"]}>
        <Admin
          dataProvider={dataProvider}
          queryClient={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
          }
          store={createStore()}
          i18n={i18n}
        >
          <Resource name="posts" edit={PostEdit} />
        </Admin>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy(),
    );
    expect(await screen.findByRole("img", { name: "Error" })).toBeTruthy();
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it("renders an empty placeholder when the record is not in the list", async () => {
    // Gamma is a draft, so the published-only list does not hold it.
    const { container, getList } = mount({ id: 3 });
    await waitFor(() => expect(getList).toHaveBeenCalled());
    await waitFor(() =>
      expect(container.querySelector('[data-slot="skeleton"]')).toBeNull(),
    );
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("link", { name: "Previous" })).toBeNull();
    expect(screen.queryByRole("img", { name: "Error" })).toBeNull();
    expect(
      container.querySelector('[data-slot="prev-next-placeholder"]'),
    ).toBeTruthy();
  });
});
