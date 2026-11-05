/**
 * `<Count>`: the total of a resource, read from a one-row `getList` page.
 * Mounted under `<Admin>` over a seeded `fakeDataProvider` with a spy on
 * `getList`; stubs where a case needs a rejection, a pending read or a missing
 * `total`.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { defineComponent, h, reactive } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Count, { type CountProps } from "./count.vue";

type GetListSpy = MockInstance<ReturnType<typeof fakeDataProvider>["getList"]>;

const posts = [
  { id: 1, title: "Alpha", status: "draft" },
  { id: 2, title: "Beta", status: "published" },
  { id: 3, title: "Gamma", status: "draft" },
];

async function mountCount(
  props: CountProps = { resource: "posts" },
  {
    wrap,
    setup,
  }: {
    wrap?: (count: () => ReturnType<typeof h>) => ReturnType<typeof h>;
    setup?: (getList: GetListSpy) => void;
  } = {},
) {
  const dataProvider = fakeDataProvider({
    posts: structuredClone(posts),
    comments: [{ id: 1 }],
  });
  const getList = vi.spyOn(dataProvider, "getList");
  setup?.(getList);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/posts", component: { render: () => null } },
      { path: "/comments", component: { render: () => null } },
    ],
  });
  await router.push("/");
  const state = reactive<CountProps>({ ...props });
  const count = () => h(Count, { ...state });
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
            h("div", { id: "host" }, [wrap ? wrap(count) : count()]),
        },
      ),
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper: wrapper.get("#host"), getList, state };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("<Count>", () => {
  it("shows the total from a one-row getList page", async () => {
    const { wrapper, getList } = await mountCount();
    expect(wrapper.text()).toContain("3");
    expect(getList).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({ pagination: { page: 1, perPage: 1 } }),
    );
  });

  it("passes filter and sort to getList", async () => {
    const { wrapper, getList } = await mountCount({
      resource: "posts",
      filter: { status: "draft" },
      sort: { field: "title", order: "DESC" },
    });
    expect(wrapper.text()).toContain("2");
    expect(getList).toHaveBeenCalledWith(
      "posts",
      expect.objectContaining({
        filter: { status: "draft" },
        sort: { field: "title", order: "DESC" },
      }),
    );
  });

  it("renders 0 for an empty total and nothing for a missing total", async () => {
    const empty = await mountCount({
      resource: "posts",
      filter: { status: "none" },
    });
    expect(empty.wrapper.text()).toContain("0");

    const missing = await mountCount(
      { resource: "posts" },
      {
        setup: (getList) => {
          getList.mockResolvedValue({ data: [] });
        },
      },
    );
    expect(missing.getList).toHaveBeenCalled();
    expect(missing.wrapper.text()).toBe("");
  });

  it("shows a spinner only after the timeout while pending", async () => {
    vi.useFakeTimers();
    const { wrapper } = await mountCount(
      { resource: "posts", timeout: 100 },
      {
        setup: (getList) => {
          getList.mockReturnValue(new Promise<never>(() => {}));
        },
      },
    );
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(150);
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });

  it("restarts the spinner wait on every uncached load", async () => {
    vi.useFakeTimers();
    const { wrapper, state } = await mountCount(
      { resource: "posts", filter: { status: "draft" }, timeout: 100 },
      {
        setup: (getList) => {
          getList.mockImplementationOnce(
            () =>
              new Promise((resolve) =>
                setTimeout(() => resolve({ data: [], total: 1 }), 200),
              ),
          );
          getList.mockReturnValue(new Promise<never>(() => {}));
        },
      },
    );
    await vi.advanceTimersByTimeAsync(250);
    expect(wrapper.text()).toContain("1");

    state.filter = { status: "published" };
    await vi.advanceTimersByTimeAsync(10);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(150);
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });

  it("refetches and relinks when the resource prop changes", async () => {
    const { wrapper, getList, state } = await mountCount({
      resource: "posts",
      link: true,
    });
    expect(wrapper.get("a").attributes("href")).toBe("/posts");

    state.resource = "comments";
    await flushPromises();
    expect(getList).toHaveBeenCalledWith("comments", expect.anything());
    expect(wrapper.get("a").attributes("href")).toBe("/comments");
  });

  it("shows a labelled error icon when getList fails", async () => {
    const { wrapper } = await mountCount(
      { resource: "posts" },
      {
        setup: (getList) => {
          getList.mockRejectedValue(new Error("boom"));
        },
      },
    );
    expect(wrapper.find('[role="img"][aria-label="Error"]').exists()).toBe(
      true,
    );
  });

  it("link goes to the list with the filter encoded in the search", async () => {
    const { wrapper } = await mountCount({
      resource: "posts",
      filter: { status: "draft" },
      link: true,
    });
    const href = wrapper.get("a").attributes("href") ?? "";
    const [path, search] = href.split("?");
    expect(wrapper.get("a").text()).toBe("2");
    expect(path).toBe("/posts");
    expect(JSON.parse(new URLSearchParams(search).get("filter") ?? "")).toEqual(
      { status: "draft" },
    );
  });

  it("clicking the link does not reach a parent click handler", async () => {
    const onRowClick = vi.fn();
    const { wrapper } = await mountCount(
      { resource: "posts", link: true },
      { wrap: (count) => h("div", { onClick: onRowClick }, [count()]) },
    );
    await wrapper.get("a").trigger("click");
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("throws without a resource", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(mountCount({})).rejects.toThrow(/resource/);
    spy.mockRestore();
  });
});
