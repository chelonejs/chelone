/**
 * `useGetManyReference` — mounted through a probe component under a real
 * `<Admin>` (which installs the vue-query client and the Chelone context) over a
 * seeded `fakeDataProvider`. Each case asserts what the probe renders and what
 * the provider was asked, never an internal.
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type Ref, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import { useGetManyReference } from "./queries";

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
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getManyReference).not.toHaveBeenCalled();
    expect(rows()).toEqual([]);
    enabled.value = true;
    await vi.waitFor(() => expect(rows()).toEqual(["x", "z"]));
  });
});
