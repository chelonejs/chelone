/**
 * `<ReferenceOneField>` resolves its record through `getManyReference` (one row)
 * via `useReferenceOneFieldController`. Each case mounts the field under a real
 * `<Admin>` over a seeded `fakeDataProvider` and asserts the DOM and the
 * data-provider calls.
 */

import { fakeDataProvider, type LooseRecord } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import { provideRecordContext } from "../../../record/record-context";
import ReferenceOneField from "./reference-one-field.vue";
import TextField from "./text-field.vue";

const bios = [
  { id: 1, author_id: 1, kind: "short", body: "Irish novelist." },
  { id: 2, author_id: 2, kind: "short", body: "American essayist." },
  { id: 3, author_id: 3, kind: "short", body: "First of two." },
  { id: 4, author_id: 3, kind: "long", body: "Second of two." },
];

function makeProvider() {
  return fakeDataProvider({ bios: structuredClone(bios) });
}

function mountAdmin(
  dataProvider: ReturnType<typeof makeProvider>,
  render: () => unknown,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  // An empty #layout slot suppresses the default chrome, whose text would leak
  // into `w.text()`.
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          { dataProvider, queryClient },
          { default: render, layout: () => h("div") },
        );
    },
  });
  return mount(Harness, { global: { plugins: [router] } });
}

/** Mounts `ReferenceOneField` over `record` with the given props. */
function mountField(
  dataProvider: ReturnType<typeof makeProvider>,
  record: Record<string, unknown>,
  props: Record<string, unknown> = {},
) {
  return mountAdmin(dataProvider, () =>
    h(
      defineComponent({
        setup() {
          provideRecordContext(record);
          return () =>
            h(
              ReferenceOneField,
              { reference: "bios", target: "author_id", ...props },
              { default: () => h(TextField, { source: "body" }) },
            );
        },
      }),
    ),
  );
}

describe("ReferenceOneField", () => {
  it("calls getManyReference with the target, the record id and one row, and never getList", async () => {
    const dataProvider = makeProvider();
    const getManyReference = vi.spyOn(dataProvider, "getManyReference");
    const getList = vi.spyOn(dataProvider, "getList");
    const w = mountField(dataProvider, { id: 1, name: "Jane" });
    await vi.waitFor(() => {
      expect(w.text()).toContain("Irish novelist.");
    });
    expect(getManyReference).toHaveBeenCalledTimes(1);
    expect(getManyReference).toHaveBeenCalledWith(
      "bios",
      expect.objectContaining({
        target: "author_id",
        id: 1,
        pagination: { page: 1, perPage: 1 },
      }),
    );
    expect(getList).not.toHaveBeenCalled();
  });

  it("the sort prop chooses which related record shows", async () => {
    const w = mountField(
      makeProvider(),
      { id: 3, name: "Twice" },
      { sort: { field: "id", order: "DESC" } },
    );
    await vi.waitFor(() => {
      expect(w.text()).toContain("Second of two.");
    });
    expect(w.text()).not.toContain("First of two.");
  });

  it("the filter prop narrows the lookup", async () => {
    const w = mountField(
      makeProvider(),
      { id: 3, name: "Twice" },
      { filter: { kind: "long" } },
    );
    await vi.waitFor(() => {
      expect(w.text()).toContain("Second of two.");
    });
    expect(w.text()).not.toContain("First of two.");
  });

  it("renders the loading text while pending and the error text when the lookup rejects", async () => {
    const dataProvider = makeProvider();
    let reject: (reason: Error) => void = () => {};
    vi.spyOn(dataProvider, "getManyReference").mockImplementationOnce(
      () =>
        new Promise((_, rej) => {
          reject = rej;
        }),
    );
    const w = mountField(
      dataProvider,
      { id: 1, name: "Jane" },
      { loading: "Loading bio", error: "Bio failed", empty: "No bio" },
    );
    await vi.waitFor(() => {
      expect(w.text()).toContain("Loading bio");
    });
    reject(new Error("boom"));
    await vi.waitFor(() => {
      expect(w.text()).toContain("Bio failed");
    });
    expect(w.text()).not.toContain("Loading bio");
    expect(w.text()).not.toContain("No bio");
  });

  it("resolves a record that arrives late", async () => {
    const record = ref<LooseRecord | undefined>(undefined);
    const dataProvider = makeProvider();
    const getManyReference = vi.spyOn(dataProvider, "getManyReference");
    const w = mountAdmin(dataProvider, () =>
      h(
        defineComponent({
          setup() {
            return () =>
              h(
                ReferenceOneField,
                {
                  reference: "bios",
                  target: "author_id",
                  empty: "No bio",
                  record: record.value,
                },
                { default: () => h(TextField, { source: "body" }) },
              );
          },
        }),
      ),
    );
    await nextTick();
    expect(w.text()).toContain("No bio");
    expect(getManyReference).not.toHaveBeenCalled();

    record.value = { id: 2, name: "John" };
    await vi.waitFor(() => {
      expect(w.text()).toContain("American essayist.");
    });
    expect(w.text()).not.toContain("No bio");
    expect(getManyReference).toHaveBeenCalledTimes(1);
  });
});
