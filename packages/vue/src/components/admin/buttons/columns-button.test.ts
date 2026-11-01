/**
 * `<ColumnsButton>` — mounted next to a real `<DataTable>` under `<Admin>`
 * and `<List>`, so the table publishes its columns into the store the way it does
 * in an app, and the assertions read the table's headers back.
 */

import {
  type CheloneStore,
  createStore,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import DataTable from "../list/data-table.vue";
import DataTableCol from "../list/data-table-col.vue";
import List from "../view/list.vue";
import ColumnsButton from "./columns-button.vue";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});

const seed = [{ id: 1, title: "alpha", views: 10 }];

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

const threeColumns = () => [
  h(DataTableCol, { source: "id" }),
  h(DataTableCol, { source: "title" }),
  h(DataTableCol, { source: "views" }),
];

const sixColumns = () =>
  ["Alpha", "Beta", "Gamma", "Delta", "Épsilon", "Zeta"].map((label) =>
    h(DataTableCol, { label }, { default: () => "x" }),
  );

function mountPage(
  options: {
    store?: CheloneStore;
    columns?: () => unknown[];
    tableProps?: Record<string, unknown>;
    buttonProps?: Record<string, unknown>;
  } = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider<typeof resources>({
              posts: structuredClone(seed),
            }),
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
            store: options.store,
          },
          {
            default: () =>
              h(
                List,
                { resource: "posts" },
                {
                  default: () => [
                    h(ColumnsButton, options.buttonProps ?? null),
                    h(DataTable, options.tableProps ?? null, {
                      default: () => (options.columns ?? threeColumns)(),
                    }),
                  ],
                },
              ),
          },
        );
    },
  });
  wrapper = mount(Harness, { global: { plugins: [router] } });
  return wrapper;
}

const trigger = (w: VueWrapper) => w.get('[data-slot="columns-button"]');
const headers = (w: VueWrapper) => w.findAll("th").map((th) => th.text());
const rows = (w: VueWrapper) => w.findAll('[data-slot="columns-button-row"]');
const rowLabels = (w: VueWrapper) => rows(w).map((row) => row.text());
const rowFor = (w: VueWrapper, label: string) => {
  const row = rows(w).find((candidate) => candidate.text() === label);
  if (!row) throw new Error(`no row labelled ${label}`);
  return row;
};
const switchFor = (w: VueWrapper, label: string) =>
  rowFor(w, label).get('input[role="switch"]');
const rowButton = (w: VueWrapper, label: string, name: string) =>
  rowFor(w, label).get(`button[aria-label="${name}"]`);
const panel = (w: VueWrapper) => w.find('[role="menu"]');
const disabled = (button: { element: Element }) =>
  (button.element as HTMLButtonElement).disabled;
const checked = (w: VueWrapper, label: string) =>
  (switchFor(w, label).element as HTMLInputElement).checked;

async function openMenu(w: VueWrapper) {
  await vi.waitFor(() => expect(disabled(trigger(w))).toBe(false));
  await trigger(w).trigger("click");
}

describe("<ColumnsButton>", () => {
  it("lists the columns the DataTable published, each with a switch", async () => {
    const w = mountPage({ store: createStore() });
    await openMenu(w);

    expect(rowLabels(w)).toEqual(["Id", "Title", "Views"]);
    expect(w.findAll('input[role="switch"]')).toHaveLength(3);
    for (const label of ["Id", "Title", "Views"]) {
      expect(checked(w, label)).toBe(true);
    }
  });

  it("turning a switch off hides that column in the table and on again shows it", async () => {
    const w = mountPage({ store: createStore() });
    await openMenu(w);
    expect(headers(w)).toEqual(["Id", "Title", "Views"]);

    await switchFor(w, "Title").setValue(false);
    expect(headers(w)).toEqual(["Id", "Views"]);
    expect(checked(w, "Title")).toBe(false);

    await switchFor(w, "Title").setValue(true);
    expect(headers(w)).toEqual(["Id", "Title", "Views"]);
  });

  it("stays open while a switch or a move button is used", async () => {
    const w = mountPage({ store: createStore() });
    await openMenu(w);

    await switchFor(w, "Title").setValue(false);
    expect(panel(w).exists()).toBe(true);

    await rowButton(w, "Views", "Move up").trigger("click");
    expect(panel(w).exists()).toBe(true);
    await rowButton(w, "Id", "Move down").trigger("click");
    expect(panel(w).exists()).toBe(true);
  });

  it("move down and move up reorder the table columns", async () => {
    const w = mountPage({ store: createStore() });
    await openMenu(w);

    await rowButton(w, "Id", "Move down").trigger("click");
    expect(rowLabels(w)).toEqual(["Title", "Id", "Views"]);
    expect(headers(w)).toEqual(["Title", "Id", "Views"]);

    await rowButton(w, "Views", "Move up").trigger("click");
    expect(rowLabels(w)).toEqual(["Title", "Views", "Id"]);
    expect(headers(w)).toEqual(["Title", "Views", "Id"]);
  });

  it("disables move up on the first row and move down on the last", async () => {
    const w = mountPage({ store: createStore() });
    await openMenu(w);

    const off = (label: string, name: string) =>
      disabled(rowButton(w, label, name));
    expect(off("Id", "Move up")).toBe(true);
    expect(off("Id", "Move down")).toBe(false);
    expect(off("Views", "Move up")).toBe(false);
    expect(off("Views", "Move down")).toBe(true);

    await rowButton(w, "Id", "Move down").trigger("click");
    expect(off("Title", "Move up")).toBe(true);
    expect(off("Id", "Move up")).toBe(false);
  });

  it("turning a switch on keeps the other columns the table hides by default", async () => {
    const w = mountPage({
      store: createStore(),
      tableProps: { defaultHiddenColumns: ["title", "views"] },
    });
    await openMenu(w);
    expect(headers(w)).toEqual(["Id"]);
    expect(checked(w, "Title")).toBe(false);

    await switchFor(w, "Title").setValue(true);

    expect(headers(w)).toEqual(["Id", "Title"]);
    expect(checked(w, "Views")).toBe(false);
  });

  it("Reset restores the default hidden columns and the declared order", async () => {
    const w = mountPage({
      store: createStore(),
      tableProps: { defaultHiddenColumns: ["views"] },
    });
    await openMenu(w);

    await switchFor(w, "Views").setValue(true);
    await switchFor(w, "Id").setValue(false);
    await rowButton(w, "Title", "Move down").trigger("click");
    expect(headers(w)).toEqual(["Views", "Title"]);

    const reset = w.findAll("button").find((b) => b.text() === "Reset");
    await reset?.trigger("click");

    expect(headers(w)).toEqual(["Id", "Title"]);
    expect(rowLabels(w)).toEqual(["Id", "Title", "Views"]);
  });

  it("the choice survives a remount through the store", async () => {
    const store = createStore();
    const first = mountPage({ store });
    await openMenu(first);
    await switchFor(first, "Title").setValue(false);
    await rowButton(first, "Id", "Move down").trigger("click");
    expect(headers(first)).toEqual(["Id", "Views"]);
    first.unmount();

    const second = mountPage({ store });
    await vi.waitFor(() => expect(headers(second)).toEqual(["Id", "Views"]));
    await openMenu(second);
    expect(rowLabels(second)).toEqual(["Title", "Id", "Views"]);
    expect(checked(second, "Title")).toBe(false);
  });

  it("shows a search box over five columns and filters ignoring accents", async () => {
    const few = mountPage({ store: createStore() });
    await openMenu(few);
    expect(few.find('input[type="text"]').exists()).toBe(false);
    few.unmount();

    const w = mountPage({ store: createStore(), columns: sixColumns });
    await openMenu(w);
    expect(rowLabels(w)).toHaveLength(6);

    await w.get('input[type="text"]').setValue("epsilon");
    expect(rowLabels(w)).toEqual(["Épsilon"]);

    await w.get('button[aria-label="Clear value"]').trigger("click");
    expect(rowLabels(w)).toHaveLength(6);
    expect(w.find('button[aria-label="Clear value"]').exists()).toBe(false);
  });

  it("disables the move buttons while a search is active", async () => {
    const w = mountPage({ store: createStore(), columns: sixColumns });
    await openMenu(w);
    const moveButtons = () =>
      w
        .findAll("button")
        .filter((b) =>
          ["Move up", "Move down"].includes(b.attributes("aria-label") ?? ""),
        );
    expect(moveButtons().some((b) => !disabled(b))).toBe(true);

    await w.get('input[type="text"]').setValue("a");

    expect(moveButtons().length).toBeGreaterThan(0);
    for (const button of moveButtons()) expect(disabled(button)).toBe(true);
  });

  it("is disabled before a table has published columns", () => {
    const w = mountPage({ store: createStore() });

    expect(disabled(trigger(w))).toBe(true);
  });

  it("throws without a store, and without a resource or storeKey", () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: { render: () => null } }],
    });
    const mountButton = (store?: CheloneStore) =>
      mount(Admin, {
        props: { dataProvider: fakeDataProvider({}), store },
        slots: { default: () => h(ColumnsButton) },
        global: { plugins: [router] },
      });

    expect(() => mountButton()).toThrow(/store/);
    expect(() => mountButton(createStore())).toThrow(/resource/);
  });
});
