/**
 * `<SimpleList>` and its parts: a list of records as tappable rows. Mounted as
 * `<MemoryRouter><Admin><Resource list/edit/show/></Admin></MemoryRouter>` (the
 * canonical app composition) so the router adapter, resource registry and list
 * controller are real; assertions are on DOM, roles, hrefs and data-provider
 * calls.
 */
import {
  createI18n,
  createNotificationStore,
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
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeListContext } from "../../../__fixtures__/list-context";
import { Admin } from "../../../admin/admin";
import { CheloneProvider } from "../../../context";
import { ListContextProvider, useListContext } from "../../../form";
import { Resource } from "../../../resource";
import { List } from "../views/list";
import { ListNoResults } from "./list-no-results";
import { SimpleList } from "./simple-list";
import { SimpleListItem } from "./simple-list-item";

afterEach(cleanup);

const POSTS = [
  { id: 1, title: "Alpha", author: "Ada", year: "2021" },
  { id: 2, title: "Beta", author: "Alan", year: "2022" },
];

interface Post {
  id: number;
  title: string;
  author: string;
  year: string;
}

type Provider = ReturnType<typeof fakeDataProvider>;

function mount({
  list,
  dataProvider = fakeDataProvider({ posts: POSTS }),
  url = "/posts",
  edit = true,
  show = true,
}: {
  list: () => ReactNode;
  dataProvider?: Provider;
  url?: string;
  edit?: boolean;
  show?: boolean;
}) {
  const View = () => null;
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        i18n={createI18n({
          locale: "en",
          messages: { en: defineMessages({}) },
        })}
        notifications={createNotificationStore()}
      >
        <Resource
          name="posts"
          list={list}
          edit={edit ? View : undefined}
          show={show ? View : undefined}
        />
      </Admin>
    </MemoryRouter>,
  );
}

describe("<SimpleList>", () => {
  it("renders one row per record with primary, secondary and tertiary text", async () => {
    mount({
      list: () => (
        <List>
          <SimpleList<Post>
            primaryText={(r) => r.title}
            secondaryText={(r) => r.author}
            tertiaryText={(r) => r.year}
          />
        </List>
      ),
    });

    const [first, second, ...rest] = await screen.findAllByRole("listitem");
    expect(rest).toHaveLength(0);
    if (!first || !second) throw new Error("expected two rows");
    expect(within(first).getByText("Alpha")).toBeTruthy();
    expect(within(first).getByText("Ada")).toBeTruthy();
    expect(within(first).getByText("2021")).toBeTruthy();
    expect(within(second).getByText("Beta")).toBeTruthy();
    expect(within(second).getByText("Alan")).toBeTruthy();
    expect(within(second).getByText("2022")).toBeTruthy();
  });

  it("passes the record and its id to every slot function", async () => {
    const slot = () => vi.fn((_record: Post, _id: unknown) => "x");
    const slots = {
      primaryText: slot(),
      secondaryText: slot(),
      tertiaryText: slot(),
      leftAvatar: slot(),
      leftIcon: slot(),
      rightIcon: slot(),
    };
    mount({
      list: () => (
        <List>
          <SimpleList<Post> {...slots} />
        </List>
      ),
    });

    await screen.findAllByRole("listitem");
    for (const fn of Object.values(slots)) {
      expect(fn).toHaveBeenCalledWith(POSTS[0], 1);
      expect(fn).toHaveBeenCalledWith(POSTS[1], 2);
    }
  });

  it("links each row to the edit page by default", async () => {
    mount({
      list: () => (
        <List>
          <SimpleList<Post> primaryText={(r) => r.title} />
        </List>
      ),
    });

    const links = await screen.findAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/posts/1",
      "/posts/2",
    ]);
    expect(within(links[0] as HTMLElement).getByText("Alpha")).toBeTruthy();
  });

  it("links to the show page when linkType is show", async () => {
    mount({
      list: () => (
        <List>
          <SimpleList<Post> linkType="show" primaryText={(r) => r.title} />
        </List>
      ),
    });

    const links = await screen.findAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/posts/1/show",
      "/posts/2/show",
    ]);
  });

  it("falls back to the show page when the resource has no edit view", async () => {
    mount({
      edit: false,
      list: () => (
        <List>
          <SimpleList<Post> primaryText={(r) => r.title} />
        </List>
      ),
    });

    const links = await screen.findAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/posts/1/show",
      "/posts/2/show",
    ]);
  });

  it("renders plain rows when the resource has neither an edit nor a show view", async () => {
    mount({
      edit: false,
      show: false,
      list: () => (
        <List>
          <SimpleList<Post> primaryText={(r) => r.title} />
        </List>
      ),
    });

    expect(await screen.findAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders plain rows with no link when linkType is false", async () => {
    mount({
      list: () => (
        <List>
          <SimpleList<Post> linkType={false} primaryText={(r) => r.title} />
        </List>
      ),
    });

    const rows = await screen.findAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("shows no skeleton in the first second and skeleton rows after it while pending", async () => {
    const dataProvider: Provider = {
      ...fakeDataProvider({ posts: POSTS }),
      getList: () => new Promise(() => {}),
    };
    const { container } = mount({
      dataProvider,
      list: () => (
        <List>
          <SimpleList<Post> primaryText={(r) => r.title} />
        </List>
      ),
    });
    const skeletons = () =>
      container.querySelectorAll('[data-slot="skeleton"]').length;

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(skeletons()).toBe(0);

    await waitFor(() => expect(skeletons()).toBeGreaterThan(0), {
      timeout: 2500,
    });
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("renders the empty prop in place of ListNoResults when given", async () => {
    mount({
      dataProvider: fakeDataProvider({ posts: [] }),
      list: () => (
        <List>
          <SimpleList<Post>
            primaryText={(r) => r.title}
            empty={<p>Nothing posted yet</p>}
          />
        </List>
      ),
    });

    expect(await screen.findByText("Nothing posted yet")).toBeTruthy();
    expect(screen.queryByText("No results found")).toBeNull();
  });

  it("renders nothing for an empty prop of null", async () => {
    function Settled() {
      const { isPending } = useListContext();
      return isPending ? null : <span>settled</span>;
    }
    mount({
      dataProvider: fakeDataProvider({ posts: [] }),
      list: () => (
        <List>
          <Settled />
          <div data-testid="body">
            <SimpleList<Post> primaryText={(r) => r.title} empty={null} />
          </div>
        </List>
      ),
    });

    await screen.findByText("settled");
    expect(screen.getByTestId("body").textContent).toBe("");
  });
});

describe("<ListNoResults>", () => {
  it("says no results found when the list has no filter", async () => {
    mount({
      dataProvider: fakeDataProvider({ posts: [] }),
      list: () => (
        <List>
          <SimpleList<Post> primaryText={(r) => r.title} />
        </List>
      ),
    });

    expect(await screen.findByText("No results found")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });

  it("offers Clear filters under an active filter and clearing it empties the list filter", async () => {
    function FilterProbe() {
      const { filter } = useListContext();
      return <output data-testid="filter">{JSON.stringify(filter)}</output>;
    }
    mount({
      url: `/posts?filter=${encodeURIComponent(JSON.stringify({ title: "Zeta" }))}`,
      list: () => (
        <List>
          <FilterProbe />
          <SimpleList<Post> primaryText={(r) => r.title} />
        </List>
      ),
    });

    expect(
      await screen.findByText("No results found with the current filters."),
    ).toBeTruthy();
    expect(screen.getByTestId("filter").textContent).toBe('{"title":"Zeta"}');

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    await waitFor(() =>
      expect(screen.getByTestId("filter").textContent).toBe("{}"),
    );
    expect(await screen.findAllByRole("listitem")).toHaveLength(2);
  });

  it("throws outside a resource", () => {
    const list = makeListContext({ filter: {}, setFilters: vi.fn() });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <CheloneProvider
          dataProvider={fakeDataProvider({})}
          queryClient={new QueryClient()}
          i18n={createI18n({
            locale: "en",
            messages: { en: defineMessages({}) },
          })}
        >
          <ListContextProvider value={list}>
            <ListNoResults />
          </ListContextProvider>
        </CheloneProvider>,
      ),
    ).toThrow("<ListNoResults> must be used inside a <List> component");
    spy.mockRestore();
  });
});

describe("<SimpleListItem>", () => {
  it("renders nothing without a record", async () => {
    const { container } = mount({
      list: () => (
        <List>
          <ul data-testid="rows">
            <SimpleListItem resource="posts">row</SimpleListItem>
          </ul>
        </List>
      ),
    });

    await screen.findByTestId("rows");
    expect(container.querySelector("li")).toBeNull();
    expect(screen.queryByText("row")).toBeNull();
  });
});
