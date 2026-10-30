/**
 * `<InfinitePagination>` and `<InfiniteList>` under a real `<Admin>`. The
 * pagination cases publish a stubbed infinite list context so each test
 * controls `hasNextPage` / `isFetchingNextPage`; the list cases run the real
 * controller against a `fakeDataProvider`.
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, reactive } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../admin/admin.vue";
import {
  type ListContextValue,
  provideListContext,
  useListContext,
} from "../../list/list-context";
import DataTable from "./list/data-table.vue";
import DataTableCol from "./list/data-table-col.vue";
import InfinitePagination from "./list/infinite-pagination.vue";
import InfiniteList from "./view/infinite-list.vue";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Resources = typeof resources;

const seed = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  title: `t${i + 1}`,
}));

function mountAdmin(render: () => unknown) {
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(seed),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () => h(Admin, { dataProvider, queryClient }, { default: render });
    },
  });
  return mount(Harness, { global: { plugins: [router] } });
}

/** An `IntersectionObserver` double that records every instance it creates. */
class FakeObserver {
  static instances: FakeObserver[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = () => [];
  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    FakeObserver.instances.push(this);
  }
  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

const live = () =>
  FakeObserver.instances.filter((o) => o.disconnect.mock.calls.length === 0);

/** The one observer still connected. */
function liveObserver(): FakeObserver {
  const [observer] = live();
  if (!observer) throw new Error("no live IntersectionObserver");
  return observer;
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeObserver.instances = [];
});

function stubList(overrides: Record<string, unknown> = {}) {
  return reactive({
    data: [{ id: 1 }],
    isPending: false,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    fetchPreviousPage: vi.fn(),
    ...overrides,
  });
}

/** Publishes `list` as the ambient list context, then renders `child`. */
function withList(list: ReturnType<typeof stubList>, child: unknown) {
  return defineComponent({
    setup() {
      provideListContext(list as unknown as ListContextValue);
      return () => h(child as never);
    },
  });
}

function mountPagination(
  list: ReturnType<typeof stubList>,
  props: Record<string, unknown> = {},
) {
  const child = defineComponent({ render: () => h(InfinitePagination, props) });
  return mountAdmin(() => h(withList(list, child)));
}

describe("InfinitePagination", () => {
  it("shows Load more while hasNextPage and calls fetchNextPage on click", async () => {
    const list = stubList();
    const wrapper = mountPagination(list);

    const button = wrapper.find("button");
    expect(button.text()).toBe("Load more");
    await button.trigger("click");
    expect(list.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("disables Load more while isFetchingNextPage", () => {
    const list = stubList({ isFetchingNextPage: true });
    const wrapper = mountPagination(list);
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });

  it("shows the end message and no button when hasNextPage is false", () => {
    const wrapper = mountPagination(stubList({ hasNextPage: false }));
    expect(wrapper.text()).toContain("No more rows");
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("renders nothing while the first page is loading", () => {
    const wrapper = mountPagination(
      stubList({ isPending: true, data: undefined, hasNextPage: undefined }),
    );
    expect(wrapper.find('[data-slot="infinite-pagination"]').exists()).toBe(
      false,
    );
  });

  it("autoLoad calls fetchNextPage when the sentinel intersects, only while hasNextPage and not fetching", async () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const list = stubList();
    const wrapper = mountPagination(list, { offset: 100 });
    await vi.waitFor(() => expect(live()).toHaveLength(1));

    const observer = liveObserver();
    expect(observer.options?.rootMargin).toBe("0px 0px 100px 0px");
    observer.trigger(false);
    expect(list.fetchNextPage).not.toHaveBeenCalled();
    observer.trigger(true);
    expect(list.fetchNextPage).toHaveBeenCalledTimes(1);

    // While a page loads nothing observes; it observes again once it lands.
    list.isFetchingNextPage = true;
    await vi.waitFor(() => expect(live()).toHaveLength(0));
    list.isFetchingNextPage = false;
    await vi.waitFor(() => expect(live()).toHaveLength(1));

    list.hasNextPage = false;
    await vi.waitFor(() => expect(live()).toHaveLength(0));
    expect(list.fetchNextPage).toHaveBeenCalledTimes(1);
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("autoLoad false creates no IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const wrapper = mountPagination(stubList(), { autoLoad: false });
    expect(FakeObserver.instances).toHaveLength(0);
    expect(wrapper.find("button").text()).toBe("Load more");
  });

  it("unmount disconnects the IntersectionObserver", async () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const wrapper = mountPagination(stubList());
    await vi.waitFor(() => expect(live()).toHaveLength(1));
    wrapper.unmount();
    expect(live()).toHaveLength(0);
  });
});

describe("InfiniteList", () => {
  function mountList(capture: { list?: ListContextValue }) {
    const probe = defineComponent({
      setup() {
        capture.list = useListContext();
        return () => null;
      },
    });
    return mountAdmin(() =>
      h(
        InfiniteList,
        { resource: "posts", perPage: 2 },
        {
          default: () => [
            h(probe),
            h(
              DataTable,
              { bulkActions: true },
              { default: () => h(DataTableCol, { source: "title" }) },
            ),
            h(InfinitePagination, { autoLoad: false }),
          ],
        },
      ),
    );
  }

  const rows = (wrapper: ReturnType<typeof mountList>) =>
    wrapper.findAll('input[aria-label="Select row"]').length;
  const loadMore = (wrapper: ReturnType<typeof mountList>) =>
    wrapper.findAll("button").find((b) => b.text() === "Load more");

  it("loads page 1 and Load more appends page 2 to the DataTable", async () => {
    const capture: { list?: ListContextValue } = {};
    const wrapper = mountList(capture);
    await vi.waitFor(() => expect(wrapper.text()).toContain("t2"));
    expect(wrapper.text()).not.toContain("t3");
    expect(rows(wrapper)).toBe(2);

    await loadMore(wrapper)?.trigger("click");

    await vi.waitFor(() => expect(wrapper.text()).toContain("t4"));
    expect(wrapper.text()).toContain("t1");
    expect(rows(wrapper)).toBe(4);
  });

  it("selected rows stay selected after loading more", async () => {
    const capture: { list?: ListContextValue } = {};
    const wrapper = mountList(capture);
    await vi.waitFor(() => expect(wrapper.text()).toContain("t2"));

    await wrapper.find('input[aria-label="Select row"]').setValue(true);
    expect(capture.list?.selectedIds).toEqual([1]);

    await loadMore(wrapper)?.trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("t4"));

    expect(capture.list?.selectedIds).toEqual([1]);
    const boxes = wrapper.findAll('input[aria-label="Select row"]');
    expect(boxes).toHaveLength(4);
    expect(
      boxes.map((box) => (box.element as HTMLInputElement).checked),
    ).toEqual([true, false, false, false]);
  });
});
