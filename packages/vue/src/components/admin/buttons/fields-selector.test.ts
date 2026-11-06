/**
 * `<FieldsSelector>` — mounted next to a real `<DataTable>` under `<Admin>`
 * and `<List>`, so the table publishes its columns into the store under the
 * key the selector reads, and the assertions read the table's headers back.
 */

import { createStore, defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, type FunctionalComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import DataTable from "../list/data-table.vue";
import DataTableCol from "../list/data-table-col.vue";
import List from "../view/list.vue";
import FieldsSelector, {
  type FieldsSelectorListProps,
  type FieldsSelectorProps,
  type FieldsSelectorRowProps,
} from "./fields-selector.vue";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});

const seed = [{ id: 1, title: "alpha", views: 10 }];
const STORE_KEY = "posts.datatable";

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

const labelled = (label: string) =>
  h(DataTableCol, { label }, { default: () => "x" });

function mountPage(
  options: {
    columns?: () => ReturnType<typeof h>[];
    selector?: Partial<FieldsSelectorProps>;
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
            store: createStore(),
          },
          {
            default: () =>
              h(
                List,
                { resource: "posts" },
                {
                  default: () => [
                    h(FieldsSelector, {
                      storeKey: STORE_KEY,
                      resource: "posts",
                      ...options.selector,
                    }),
                    h(DataTable, null, {
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
const resetButton = (w: VueWrapper) => {
  const button = w.findAll("button").find((b) => b.text() === "Reset");
  if (!button) throw new Error("no Reset button");
  return button;
};

describe("FieldsSelector", () => {
  it("shows, hides and moves the columns a DataTable published under its store key", async () => {
    const w = mountPage();
    await vi.waitFor(() =>
      expect(rowLabels(w)).toEqual(["Id", "Title", "Views"]),
    );

    await switchFor(w, "Title").setValue(false);
    expect(headers(w)).toEqual(["Id", "Views"]);

    // Title is hidden but still listed, so Id moves past it.
    await rowButton(w, "Id", "Move down").trigger("click");
    expect(rowLabels(w)).toEqual(["Title", "Id", "Views"]);
    await rowButton(w, "Id", "Move down").trigger("click");
    expect(headers(w)).toEqual(["Views", "Id"]);

    await resetButton(w).trigger("click");
    expect(headers(w)).toEqual(["Id", "Title", "Views"]);
  });

  it("listAs and rowAs wrap the list and each row, and onMove moves a column to an index", async () => {
    const lists: Array<Pick<FieldsSelectorListProps, "ids" | "disabled">> = [];
    const rowProps: FieldsSelectorRowProps[] = [];
    const List: FunctionalComponent<FieldsSelectorListProps> = (
      props,
      { slots },
    ) => {
      lists.push({ ids: props.ids, disabled: props.disabled });
      return h("div", { "data-testid": "list" }, [
        h(
          "button",
          { type: "button", onClick: () => props.onMove("id", 2) },
          "Drop id last",
        ),
        slots.default?.(),
      ]);
    };
    List.props = ["ids", "disabled", "onMove"];
    const Row: FunctionalComponent<FieldsSelectorRowProps> = (
      props,
      { slots },
    ) => {
      rowProps.push({
        id: props.id,
        index: props.index,
        disabled: props.disabled,
      });
      return h(
        "section",
        { "data-slot": "columns-button-row", "data-row": props.id },
        slots.default?.(),
      );
    };
    Row.props = ["id", "index", "disabled"];
    const w = mountPage({ selector: { listAs: List, rowAs: Row } });
    await vi.waitFor(() => expect(rows(w)).toHaveLength(3));

    const list = w.get('[data-testid="list"]');
    expect(list.element.tagName).toBe("DIV");
    expect(list.findAll("section")).toHaveLength(3);
    expect(lists.at(-1)?.ids).toEqual(["id", "title", "views"]);
    expect(rowProps.filter((row) => row.id === "title").at(-1)).toEqual({
      id: "title",
      index: 1,
      disabled: false,
    });

    await list.get("button").trigger("click");
    expect(headers(w)).toEqual(["Title", "Views", "Id"]);
    expect(lists.at(-1)?.ids).toEqual(["title", "views", "id"]);
  });

  it("a column label with markup renders as text", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    try {
      const w = mountPage({
        columns: () => [labelled("<img src=x onerror=alert(1)>")],
      });
      await vi.waitFor(() =>
        expect(rowLabels(w)).toEqual(["<img src=x onerror=alert(1)>"]),
      );
      expect(w.find("img").exists()).toBe(false);
      expect(alert).not.toHaveBeenCalled();
    } finally {
      alert.mockRestore();
    }
  });
});
