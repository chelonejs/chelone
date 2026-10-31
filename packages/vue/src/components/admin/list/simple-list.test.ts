/**
 * `<SimpleList>` and its parts: a list of records as tappable rows. Mounted as
 * `<Admin><Resource list edit show/></Admin>` with a memory router (the app's
 * composition) so the resource registry, router and list controller are real;
 * assertions are on DOM, hrefs and data-provider calls.
 */

import {
  type DataProvider,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import { useListContext } from "../../../list/list-context";
import List from "../view/list.vue";
import SimpleList from "./simple-list.vue";
import SimpleListItem from "./simple-list-item.vue";

const POSTS = [
  { id: 1, title: "Alpha", author: "Ada", year: "2021" },
  { id: 2, title: "Beta", author: "Alan", year: "2022" },
];

type Post = (typeof POSTS)[number];

const View = defineComponent({ render: () => h("div") });

/** The text of the list's rows, scoped away from the layout's menu links. */
const rows = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('[data-slot="list"] li');
const links = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('[data-slot="list"] a');

async function mountList({
  list,
  dataProvider = fakeDataProvider({ posts: POSTS }),
  url = "/posts",
  edit = true,
  show = true,
}: {
  list: () => VNodeChild;
  dataProvider?: DataProvider;
  url?: string;
  edit?: boolean;
  show?: boolean;
}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push(url);
  const PostList = defineComponent({
    setup: () => () => h(List, { resource: "posts" }, { default: list }),
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider,
          queryClient: new QueryClient({
            defaultOptions: { queries: { retry: false } },
          }),
        },
        {
          default: () =>
            h(Resource, {
              name: "posts",
              list: PostList,
              edit: edit ? View : undefined,
              show: show ? View : undefined,
            }),
        },
      ),
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

const titleOnly = {
  "primary-text": ({ record }: { record: LooseRecord }) =>
    (record as Post).title,
};

describe("<SimpleList>", () => {
  it("renders one row per record with primary, secondary and tertiary slots", async () => {
    const wrapper = await mountList({
      list: () =>
        h(
          SimpleList,
          {},
          {
            "primary-text": ({ record }: { record: Post }) => record.title,
            "secondary-text": ({ record }: { record: Post }) => record.author,
            "tertiary-text": ({ record }: { record: Post }) => record.year,
          },
        ),
    });

    const items = rows(wrapper);
    expect(items).toHaveLength(2);
    expect(items[0]?.text()).toContain("Alpha");
    expect(items[0]?.text()).toContain("Ada");
    expect(items[0]?.text()).toContain("2021");
    expect(items[1]?.text()).toContain("Beta");
    expect(items[1]?.text()).toContain("Alan");
    expect(items[1]?.text()).toContain("2022");
  });

  it("gives every slot the record and its id", async () => {
    const slot = () => vi.fn((_props: { record: unknown; id: unknown }) => "x");
    const slots = {
      "primary-text": slot(),
      "secondary-text": slot(),
      "tertiary-text": slot(),
      "left-avatar": slot(),
      "left-icon": slot(),
      "right-icon": slot(),
    };
    await mountList({ list: () => h(SimpleList, {}, { ...slots }) });

    for (const fn of Object.values(slots)) {
      expect(fn).toHaveBeenCalledWith({ record: POSTS[0], id: 1 });
      expect(fn).toHaveBeenCalledWith({ record: POSTS[1], id: 2 });
    }
  });

  it("links each row to the edit page by default", async () => {
    const wrapper = await mountList({
      list: () => h(SimpleList, {}, titleOnly),
    });

    expect(links(wrapper).map((a) => a.attributes("href"))).toEqual([
      "/posts/1",
      "/posts/2",
    ]);
    expect(links(wrapper)[0]?.text()).toContain("Alpha");
  });

  it("links to the show page when linkType is show", async () => {
    const wrapper = await mountList({
      list: () => h(SimpleList, { linkType: "show" }, titleOnly),
    });

    expect(links(wrapper).map((a) => a.attributes("href"))).toEqual([
      "/posts/1/show",
      "/posts/2/show",
    ]);
  });

  it("falls back to the show page when the resource has no edit view", async () => {
    const wrapper = await mountList({
      edit: false,
      list: () => h(SimpleList, {}, titleOnly),
    });

    expect(links(wrapper).map((a) => a.attributes("href"))).toEqual([
      "/posts/1/show",
      "/posts/2/show",
    ]);
  });

  it("renders plain rows when the resource has neither an edit nor a show view", async () => {
    const wrapper = await mountList({
      edit: false,
      show: false,
      list: () => h(SimpleList, {}, titleOnly),
    });

    expect(rows(wrapper)).toHaveLength(2);
    expect(links(wrapper)).toHaveLength(0);
  });

  it("renders plain rows with no link when linkType is false", async () => {
    const wrapper = await mountList({
      list: () => h(SimpleList, { linkType: false }, titleOnly),
    });

    expect(rows(wrapper)).toHaveLength(2);
    expect(links(wrapper)).toHaveLength(0);
  });

  it("shows no skeleton in the first second and skeleton rows after it while pending", async () => {
    vi.useFakeTimers();
    try {
      const dataProvider: DataProvider = {
        ...fakeDataProvider({ posts: POSTS }),
        getList: () => new Promise(() => {}),
      };
      const wrapper = await mountList({
        dataProvider,
        list: () =>
          h(
            SimpleList,
            {},
            {
              ...titleOnly,
              "secondary-text": ({ record }: { record: Post }) => record.author,
            },
          ),
      });
      const skeletons = () => wrapper.findAll('[data-slot="skeleton"]').length;

      await vi.advanceTimersByTimeAsync(900);
      expect(skeletons()).toBe(0);

      await vi.advanceTimersByTimeAsync(200);
      expect(skeletons()).toBeGreaterThan(0);
      expect(rows(wrapper)).toHaveLength(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders the empty slot in place of ListNoResults when given", async () => {
    const wrapper = await mountList({
      dataProvider: fakeDataProvider({ posts: [] }),
      list: () =>
        h(
          SimpleList,
          {},
          { ...titleOnly, empty: () => h("p", "Nothing posted yet") },
        ),
    });

    expect(wrapper.text()).toContain("Nothing posted yet");
    expect(wrapper.text()).not.toContain("No results found");
  });

  it("renders the loading slot in place of SimpleListLoading when given", async () => {
    const dataProvider: DataProvider = {
      ...fakeDataProvider({ posts: POSTS }),
      getList: () => new Promise(() => {}),
    };
    const wrapper = await mountList({
      dataProvider,
      list: () =>
        h(SimpleList, {}, { ...titleOnly, loading: () => h("p", "Fetching") }),
    });

    expect(wrapper.text()).toContain("Fetching");
  });
});

describe("<ListNoResults>", () => {
  it("says no results found when the list has no filter", async () => {
    const wrapper = await mountList({
      dataProvider: fakeDataProvider({ posts: [] }),
      list: () => h(SimpleList, {}, titleOnly),
    });

    expect(wrapper.text()).toContain("No results found");
    expect(wrapper.findAll('[data-slot="list"] button')).toHaveLength(0);
  });

  it("offers Clear filters under an active filter and clearing it empties the list filter", async () => {
    const filter = encodeURIComponent(JSON.stringify({ title: "Zeta" }));
    const Probe = defineComponent({
      setup() {
        const list = useListContext();
        return () =>
          h("output", { "data-testid": "filter" }, JSON.stringify(list.filter));
      },
    });
    const wrapper = await mountList({
      url: `/posts?filter=${filter}`,
      list: () => [h(Probe), h(SimpleList, {}, titleOnly)],
    });

    expect(wrapper.text()).toContain(
      "No results found with the current filters.",
    );
    expect(wrapper.get("[data-testid=filter]").text()).toBe('{"title":"Zeta"}');

    const clear = wrapper
      .findAll('[data-slot="list"] button')
      .find((b) => b.text() === "Clear filters");
    expect(clear).toBeDefined();
    await clear?.trigger("click");

    await vi.waitFor(() =>
      expect(wrapper.get("[data-testid=filter]").text()).toBe("{}"),
    );
    await vi.waitFor(() => expect(rows(wrapper)).toHaveLength(2));
  });
});

describe("<SimpleListItem>", () => {
  it("renders nothing without a record", async () => {
    const wrapper = await mountList({
      list: () =>
        h("ul", { "data-testid": "rows" }, [
          h(SimpleListItem, { resource: "posts" }, { default: () => "row" }),
        ]),
    });

    expect(wrapper.find("[data-testid=rows]").exists()).toBe(true);
    expect(wrapper.find('[data-slot="list"] li').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("row");
  });
});
