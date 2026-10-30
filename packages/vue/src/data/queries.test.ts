/**
 * `useGetManyReference` and `useGetManyAggregate` — mounted through probe
 * components under a real
 * `<Admin>` (which installs the vue-query client and the Chelone context) over a
 * seeded `fakeDataProvider`. Each case asserts what the probe renders and what
 * the provider was asked, never an internal.
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type Ref, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import { useGetManyAggregate, useGetManyReference } from "./queries";

const resources = defineResources({
  comments: {
    schema: z.object({ id: z.number(), post_id: z.number(), body: z.string() }),
  },
});
type Resources = typeof resources;

function mountProbe(options: { id: Ref<number>; enabled?: Ref<boolean> }) {
  const dataProvider = fakeDataProvider<Resources>({
    comments: [
      { id: 1, post_id: 1, body: "x" },
      { id: 2, post_id: 2, body: "y" },
      { id: 3, post_id: 1, body: "z" },
    ],
  });
  const getManyReference = vi.spyOn(dataProvider, "getManyReference");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient },
        { default: () => h(Probe), layout: () => h("div") },
      ),
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
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

const postResources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type PostResources = typeof postResources;

/**
 * One probe per entry in `idLists`, all siblings under one `<Admin>`, each
 * rendering `<ul data-testid="probe-N">` with the titles it received.
 */
function mountAggregateProbes(
  idLists: Array<Ref<number[]>>,
  options: { enabled?: Ref<boolean> } = {},
) {
  const dataProvider = fakeDataProvider<PostResources>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
      { id: 3, title: "c" },
    ],
  });
  const getMany = vi.spyOn(dataProvider, "getMany");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const probes = idLists.map((ids, index) =>
    defineComponent({
      setup() {
        const query = useGetManyAggregate<PostResources, "posts">(
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
          ]);
      },
    }),
  );
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
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  const titles = (index: number) =>
    wrapper
      .get(`[data-testid="probe-${index}"]`)
      .findAll("li")
      .map((li) => li.text());
  const error = (index: number) =>
    wrapper.get(`[data-testid="error-${index}"]`).text();
  return { titles, error, getMany };
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
  });

  it("useGetManyAggregate does not fetch while enabled is false", async () => {
    const enabled = ref(false);
    const { titles, getMany } = mountAggregateProbes([ref([1])], { enabled });
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(getMany).not.toHaveBeenCalled();
    expect(titles(0)).toEqual([]);
    enabled.value = true;
    await vi.waitFor(() => expect(titles(0)).toEqual(["a"]));
    expect(getMany).toHaveBeenCalledTimes(1);
  });

  it("useGetManyAggregate exposes a provider rejection as error on every composable in the batch", async () => {
    const { error, getMany } = mountAggregateProbes([ref([1]), ref([2])]);
    getMany.mockRejectedValue(new Error("boom"));
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
});
