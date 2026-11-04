/**
 * `useGetList`, `useGetManyReference` and `useGetManyAggregate` — mounted through probe
 * components under a real `<Admin>` (which installs the vue-query client and
 * the Chelone context) over a seeded `fakeDataProvider`. Each case asserts what
 * the probe renders and what the provider was asked, never an internal.
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h, type Ref, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import {
  useGetList,
  useGetManyAggregate,
  useGetManyReference,
} from "./queries";

const resources = defineResources({
  comments: {
    schema: z.object({ id: z.number(), post_id: z.number(), body: z.string() }),
  },
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type Resources = typeof resources;

function seededDataProvider() {
  return fakeDataProvider<Resources>({
    comments: [
      { id: 1, post_id: 1, body: "x" },
      { id: 2, post_id: 2, body: "y" },
      { id: 3, post_id: 1, body: "z" },
    ],
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
      { id: 3, title: "c" },
    ],
  });
}

/** Mounts the probes as siblings under one `<Admin>` over `dataProvider`. */
function mountUnderAdmin(
  dataProvider: ReturnType<typeof seededDataProvider>,
  probes: Component[],
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient },
        {
          default: () =>
            h(
              "div",
              probes.map((Probe) => h(Probe)),
            ),
          layout: () => h("div"),
        },
      ),
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  return mount(Harness, { global: { plugins: [router] } });
}

function mountProbe(options: { id: Ref<number>; enabled?: Ref<boolean> }) {
  const dataProvider = seededDataProvider();
  const getManyReference = vi.spyOn(dataProvider, "getManyReference");
  const Probe = defineComponent({
    setup() {
      const query = useGetManyReference<Resources, "comments">(
        "comments",
        () => ({
          target: "post_id",
          id: options.id.value,
          pagination: { page: 1, perPage: 10 },
        }),
        { enabled: options.enabled },
      );
      return () =>
        h("div", [
          h(
            "span",
            { "data-testid": "total" },
            String(query.data.value?.total),
          ),
          h(
            "ul",
            (query.data.value?.data ?? []).map((row) =>
              h("li", { key: row.id }, row.body),
            ),
          ),
        ]);
    },
  });
  const wrapper = mountUnderAdmin(dataProvider, [Probe]);
  const rows = () => wrapper.findAll("li").map((li) => li.text());
  return { wrapper, rows, getManyReference };
}

describe("useGetManyReference", () => {
  it("useGetManyReference resolves the rows whose target field equals the id and reports the total", async () => {
    const { wrapper, rows } = mountProbe({ id: ref(1) });
    await vi.waitFor(() => expect(rows()).toEqual(["x", "z"]));
    expect(wrapper.get('[data-testid="total"]').text()).toBe("2");
  });

  it("useGetManyReference refetches when a reactive id changes", async () => {
    const id = ref(1);
    const { rows, getManyReference } = mountProbe({ id });
    await vi.waitFor(() => expect(rows()).toEqual(["x", "z"]));
    id.value = 2;
    await vi.waitFor(() => expect(rows()).toEqual(["y"]));
    expect(getManyReference).toHaveBeenCalledTimes(2);
    expect(getManyReference).toHaveBeenLastCalledWith(
      "comments",
      expect.objectContaining({ target: "post_id", id: 2 }),
    );
  });

  it("useGetManyReference does not fetch while enabled is false", async () => {
    const enabled = ref(false);
    const { rows, getManyReference } = mountProbe({ id: ref(1), enabled });
    await flushPromises();
    expect(getManyReference).not.toHaveBeenCalled();
    expect(rows()).toEqual([]);
    enabled.value = true;
    await vi.waitFor(() => expect(rows()).toEqual(["x", "z"]));
    expect(getManyReference).toHaveBeenCalledTimes(1);
  });
});

/**
 * One probe per entry in `idLists`, all siblings under one `<Admin>`. Each
 * renders `<ul data-testid="probe-N">` with the titles it received,
 * `<p data-testid="error-N">` with its error message and
 * `<p data-testid="status-N">` with its fetch status. `failWith` makes the
 * provider's `getMany` reject, installed before the probes mount.
 */
function mountAggregateProbes(
  idLists: Array<Ref<number[]>>,
  options: { enabled?: Ref<boolean>; failWith?: Error } = {},
) {
  const dataProvider = seededDataProvider();
  const getMany = vi.spyOn(dataProvider, "getMany");
  if (options.failWith) getMany.mockRejectedValue(options.failWith);
  const probes = idLists.map((ids, index) =>
    defineComponent({
      setup() {
        const query = useGetManyAggregate<Resources, "posts">(
          "posts",
          () => ({ ids: ids.value }),
          { enabled: options.enabled },
        );
        return () =>
          h("div", [
            h(
              "ul",
              { "data-testid": `probe-${index}` },
              (query.data.value ?? []).map((row) =>
                h("li", { key: row.id }, row.title),
              ),
            ),
            h(
              "p",
              { "data-testid": `error-${index}` },
              query.error.value?.message ?? "",
            ),
            h(
              "p",
              { "data-testid": `status-${index}` },
              query.fetchStatus.value,
            ),
          ]);
      },
    }),
  );
  const wrapper = mountUnderAdmin(dataProvider, probes);
  const titles = (index: number) =>
    wrapper
      .get(`[data-testid="probe-${index}"]`)
      .findAll("li")
      .map((li) => li.text());
  const error = (index: number) =>
    wrapper.get(`[data-testid="error-${index}"]`).text();
  const fetchStatus = (index: number) =>
    wrapper.get(`[data-testid="status-${index}"]`).text();
  return { titles, error, fetchStatus, getMany };
}

describe("useGetManyAggregate", () => {
  it("three useGetManyAggregate composables mounted together make one getMany call and each gets only its own records", async () => {
    const { titles, getMany } = mountAggregateProbes([
      ref([1]),
      ref([2]),
      ref([3, 1]),
    ]);
    await vi.waitFor(() => {
      expect(titles(0)).toEqual(["a"]);
      expect(titles(1)).toEqual(["b"]);
      expect(titles(2)).toEqual(["c", "a"]);
    });
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledWith("posts", { ids: [1, 2, 3] });
  });

  it("useGetManyAggregate does not fetch while enabled is false", async () => {
    const enabled = ref(false);
    const probes = mountAggregateProbes([ref([1])], { enabled });
    await flushPromises();
    expect(probes.getMany).not.toHaveBeenCalled();
    expect(probes.fetchStatus(0)).toBe("idle");
    expect(probes.titles(0)).toEqual([]);
    enabled.value = true;
    await vi.waitFor(() => expect(probes.titles(0)).toEqual(["a"]));
    expect(probes.getMany).toHaveBeenCalledTimes(1);
  });

  it("useGetManyAggregate exposes a provider rejection as error on every composable in the batch", async () => {
    const { error, getMany } = mountAggregateProbes([ref([1]), ref([2])], {
      failWith: new Error("boom"),
    });
    await vi.waitFor(() => {
      expect(error(0)).toBe("boom");
      expect(error(1)).toBe("boom");
    });
    expect(getMany).toHaveBeenCalledTimes(1);
  });

  it("useGetManyAggregate asks again when a reactive id list changes", async () => {
    const ids = ref([1]);
    const { titles, getMany } = mountAggregateProbes([ids]);
    await vi.waitFor(() => expect(titles(0)).toEqual(["a"]));
    ids.value = [2, 3];
    await vi.waitFor(() => expect(titles(0)).toEqual(["b", "c"]));
    expect(getMany).toHaveBeenCalledTimes(2);
    expect(getMany).toHaveBeenLastCalledWith("posts", { ids: [2, 3] });
  });

  it("useGetManyAggregate with an empty id list renders no records and never calls the provider", async () => {
    const probes = mountAggregateProbes([ref<number[]>([])]);
    await vi.waitFor(() => expect(probes.fetchStatus(0)).toBe("idle"));
    expect(probes.titles(0)).toEqual([]);
    expect(probes.getMany).not.toHaveBeenCalled();
  });
});

describe("useGetList", () => {
  function mountList(refetchInterval?: Parameters<typeof useGetList>[2]) {
    const dataProvider = seededDataProvider();
    const getList = vi.spyOn(dataProvider, "getList");
    const Probe = defineComponent({
      setup() {
        const query = useGetList<Resources, "posts">(
          "posts",
          {},
          refetchInterval,
        );
        return () =>
          h(
            "ul",
            (query.data.value?.data ?? []).map((row) =>
              h("li", { key: row.id }, row.title),
            ),
          );
      },
    });
    const wrapper = mountUnderAdmin(dataProvider, [Probe]);
    return { wrapper, getList };
  }
  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  it("refetches every refetchInterval ms", async () => {
    const { getList } = mountList({ refetchInterval: 30 });
    await vi.waitFor(() =>
      expect(getList.mock.calls.length).toBeGreaterThan(2),
    );
  });

  it("does not poll with refetchInterval 0 or none", async () => {
    for (const options of [
      { refetchInterval: 0 },
      { refetchInterval: -30 },
      { refetchInterval: false as const },
      {},
    ]) {
      const { wrapper, getList } = mountList(options);
      await flushPromises();
      await wait(100);
      expect(getList).toHaveBeenCalledTimes(1);
      wrapper.unmount();
    }
  });

  it("a ref refetchInterval starts and stops polling when it changes", async () => {
    const interval = ref<number | false>(false);
    const { getList } = mountList({ refetchInterval: interval });
    await flushPromises();
    await wait(100);
    expect(getList).toHaveBeenCalledTimes(1);

    interval.value = 30;
    await vi.waitFor(() =>
      expect(getList.mock.calls.length).toBeGreaterThan(3),
    );

    interval.value = false;
    await flushPromises();
    await wait(50);
    const stopped = getList.mock.calls.length;
    await wait(150);
    expect(getList).toHaveBeenCalledTimes(stopped);
  });
});
