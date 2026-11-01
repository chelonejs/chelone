/**
 * `<PrevNextButtons>`: step through the records of the list a record came
 * from. Mounted as the edit view of a `<Resource>` under `<Admin>`, over a
 * seeded `fakeDataProvider` with a spy on `getList`. The list's params are
 * persisted in the store under `posts.listParams`, as a `<List>` leaves them.
 * The edit view publishes the resource and the record the way `<Edit>` does,
 * from a ref the test can change.
 */

import {
  type CheloneStore,
  createI18n,
  createStore,
  defineMessages,
  fakeDataProvider,
  getListOptions,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type Ref, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import { provideRecordContext } from "../../../record/record-context";
import { provideResourceContext } from "../../../resource-context";
import PrevNextButtons, {
  type PrevNextButtonsProps,
} from "./prev-next-buttons.vue";

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

const mounted: ReturnType<typeof mount>[] = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

async function mountButtons({
  id,
  props,
  stored = listParams,
  dataProvider = fakeDataProvider({ posts: structuredClone(posts) }),
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
  store = createStore(),
}: {
  id: number;
  props?: PrevNextButtonsProps;
  /** `null` leaves the list never opened: nothing persisted. */
  stored?: object | null;
  dataProvider?: ReturnType<typeof fakeDataProvider>;
  queryClient?: QueryClient;
  store?: CheloneStore;
}) {
  const getList = vi.spyOn(dataProvider, "getList");
  if (stored !== null) store.setItem("posts.listParams", stored);
  const record: Ref<LooseRecord | undefined> = ref(
    posts.find((post) => post.id === id),
  );
  const PostEdit = defineComponent({
    setup() {
      provideResourceContext("posts");
      provideRecordContext(record);
      return () => h(PrevNextButtons, { ...props });
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push(`/posts/${id}`);
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient, store, i18n },
        {
          default: () =>
            h(Resource, { name: "posts", edit: PostEdit, show: PostEdit }),
        },
      ),
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, getList, queryClient, record };
}

const hrefOf = (wrapper: ReturnType<typeof mount>, name: string) =>
  wrapper.get(`a[aria-label="${name}"]`).attributes("href");

const buttonOf = (wrapper: ReturnType<typeof mount>, name: string) =>
  wrapper.get(`button[aria-label="${name}"]`);

describe("<PrevNextButtons>", () => {
  it("links to the previous and next record in the list sort and filter", async () => {
    const { wrapper, getList } = await mountButtons({ id: 4 });
    // title DESC over the published posts: Epsilon(5), Delta(4), Beta(2), Alpha(1)
    await vi.waitFor(() =>
      expect(wrapper.find('a[aria-label="Previous"]').exists()).toBe(true),
    );
    expect(hrefOf(wrapper, "Previous")).toBe("/posts/5");
    expect(hrefOf(wrapper, "Next")).toBe("/posts/2");
    expect(getList).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({
        sort: { field: "title", order: "DESC" },
        filter: { status: "published" },
      }),
    );
  });

  it("shows the position out of the total", async () => {
    const { wrapper } = await mountButtons({ id: 4 });
    await vi.waitFor(() => expect(wrapper.find("nav").exists()).toBe(true));
    expect(wrapper.get("nav").text()).toContain("2 / 4");
  });

  it("disables previous on the first record and next on the last", async () => {
    const first = await mountButtons({ id: 5 });
    await vi.waitFor(() =>
      expect(first.wrapper.find("nav").exists()).toBe(true),
    );
    expect(
      buttonOf(first.wrapper, "Previous").attributes("disabled"),
    ).toBeDefined();
    expect(hrefOf(first.wrapper, "Next")).toBe("/posts/4");
    first.wrapper.unmount();

    const last = await mountButtons({ id: 1 });
    await vi.waitFor(() =>
      expect(last.wrapper.find("nav").exists()).toBe(true),
    );
    expect(buttonOf(last.wrapper, "Next").attributes("disabled")).toBeDefined();
    expect(hrefOf(last.wrapper, "Previous")).toBe("/posts/2");
  });

  it("reads the list page from the query cache without calling getList", async () => {
    const dataProvider = fakeDataProvider({ posts: structuredClone(posts) });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    // The page the list showed, in an order the provider would not return.
    queryClient.setQueryData(
      getListOptions({ dataProvider, queryClient }, "posts", {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "title", order: "DESC" },
        filter: {},
      }).queryKey,
      { data: [posts[2], posts[1], posts[0]], total: 3 },
    );
    const { wrapper, getList } = await mountButtons({
      id: 2,
      stored: { ...listParams, filter: {} },
      dataProvider,
      queryClient,
    });
    await vi.waitFor(() =>
      expect(wrapper.find('a[aria-label="Previous"]').exists()).toBe(true),
    );
    expect(hrefOf(wrapper, "Previous")).toBe("/posts/3");
    expect(hrefOf(wrapper, "Next")).toBe("/posts/1");
    expect(getList).not.toHaveBeenCalled();
  });

  it("fetches the first limit rows when the list was never opened", async () => {
    const { wrapper, getList } = await mountButtons({
      id: 2,
      props: { limit: 3 },
      stored: null,
    });
    await vi.waitFor(() =>
      expect(wrapper.find('a[aria-label="Previous"]').exists()).toBe(true),
    );
    expect(getList).toHaveBeenCalledTimes(1);
    expect(getList).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({
        pagination: { page: 1, perPage: 3 },
        sort: { field: "id", order: "ASC" },
      }),
    );
    expect(hrefOf(wrapper, "Previous")).toBe("/posts/1");
    expect(hrefOf(wrapper, "Next")).toBe("/posts/3");
  });

  it("linkType show builds show paths", async () => {
    const { wrapper } = await mountButtons({
      id: 4,
      props: { linkType: "show" },
    });
    await vi.waitFor(() =>
      expect(wrapper.find('a[aria-label="Previous"]').exists()).toBe(true),
    );
    expect(hrefOf(wrapper, "Previous")).toBe("/posts/5/show");
    expect(hrefOf(wrapper, "Next")).toBe("/posts/2/show");
  });

  it("shows a skeleton while pending and a labelled error icon when getList fails", async () => {
    const dataProvider = fakeDataProvider({ posts: structuredClone(posts) });
    let reject: (error: Error) => void = () => {};
    vi.spyOn(dataProvider, "getList").mockReturnValue(
      new Promise((_, rejectPromise) => {
        reject = rejectPromise;
      }),
    );
    const { wrapper } = await mountButtons({ id: 2, dataProvider });
    expect(wrapper.find('[data-slot="skeleton"]').exists()).toBe(true);
    reject(new Error("boom"));
    await vi.waitFor(() =>
      expect(wrapper.find('[role="img"][aria-label="Error"]').exists()).toBe(
        true,
      ),
    );
    expect(wrapper.find('[data-slot="skeleton"]').exists()).toBe(false);
  });

  it("renders an empty placeholder when the record is not in the list", async () => {
    // Gamma is a draft, so the published-only list does not hold it.
    const { wrapper, getList } = await mountButtons({ id: 3 });
    await vi.waitFor(() => expect(getList).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="skeleton"]').exists()).toBe(false),
    );
    expect(wrapper.find("nav").exists()).toBe(false);
    expect(wrapper.find('a[aria-label="Previous"]').exists()).toBe(false);
    expect(wrapper.find('[role="img"]').exists()).toBe(false);
    expect(wrapper.find('[data-slot="prev-next-placeholder"]').exists()).toBe(
      true,
    );
  });

  it("follows the record when the ambient record changes", async () => {
    const { wrapper, record } = await mountButtons({ id: 4 });
    await vi.waitFor(() =>
      expect(wrapper.find('a[aria-label="Previous"]').exists()).toBe(true),
    );
    expect(hrefOf(wrapper, "Next")).toBe("/posts/2");

    record.value = posts[4];
    await flushPromises();
    expect(wrapper.get("nav").text()).toContain("1 / 4");
    expect(buttonOf(wrapper, "Previous").attributes("disabled")).toBeDefined();
    expect(hrefOf(wrapper, "Next")).toBe("/posts/4");
  });
});
