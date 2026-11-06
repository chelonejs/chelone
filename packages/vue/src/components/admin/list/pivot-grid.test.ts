/**
 * `<PivotGrid>`: the records of the ambient `<List>` as a pivot table. Mounted
 * as `<Admin><Resource list/></Admin>` with a memory router (the app's
 * composition); assertions are on DOM, roles and data-provider calls.
 */

import {
  createI18n,
  createNotificationStore,
  type DataProvider,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import List from "../view/list.vue";
import PivotGrid, { type PivotGridProps } from "./pivot-grid.vue";

const ORDERS = [
  { id: 1, region: "south", quarter: "Q10", amount: 10 },
  { id: 2, region: "north", quarter: "Q2", amount: 20 },
  { id: 3, region: "north", quarter: "Q2", amount: 5 },
  { id: 4, region: "south", quarter: "Q2", amount: 7 },
];

const mounted: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

async function mountGrid({
  grid = {},
  slots = {},
  records = ORDERS,
  dataProvider = fakeDataProvider({ orders: records }),
  messages = {},
}: {
  grid?: Partial<PivotGridProps>;
  slots?: Record<string, () => ReturnType<typeof h>>;
  records?: LooseRecord[];
  dataProvider?: DataProvider;
  messages?: Record<string, string>;
} = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/orders");
  const OrderList = defineComponent({
    setup: () => () =>
      h(
        List,
        { resource: "orders", perPage: 1000 },
        {
          default: () =>
            h(
              PivotGrid,
              { rowSource: "region", columnSource: "quarter", ...grid },
              slots,
            ),
        },
      ),
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
          i18n: createI18n({
            locale: "en",
            messages: { en: defineMessages(messages) },
          }),
          notifications: createNotificationStore(),
        },
        { default: () => h(Resource, { name: "orders", list: OrderList }) },
      ),
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return wrapper;
}

/** Each body row as its row header and then its cells' text. */
const body = (wrapper: VueWrapper) =>
  wrapper
    .findAll("tbody tr")
    .map((tr) =>
      Array.from(tr.element.children).map((cell) => cell.textContent),
    );

describe("<PivotGrid>", () => {
  it("renders a row per row key and a column per column key, sorted", async () => {
    const wrapper = await mountGrid();
    expect(wrapper.findAll("th[scope=col]").map((cell) => cell.text())).toEqual(
      ["Region", "Q2", "Q10", "Total"],
    );
    expect(wrapper.findAll("th[scope=row]").map((cell) => cell.text())).toEqual(
      ["north", "south", "Total"],
    );
  });

  it("counts records per cell by default", async () => {
    const wrapper = await mountGrid();
    expect(body(wrapper)).toEqual([
      ["north", "2", "", "2"],
      ["south", "1", "1", "2"],
      ["Total", "3", "1", "4"],
    ]);
  });

  it("sums the value source with aggregator sum", async () => {
    const wrapper = await mountGrid({
      grid: { valueSource: "amount", aggregator: "sum" },
    });
    expect(body(wrapper)).toEqual([
      ["north", "25", "", "25"],
      ["south", "7", "10", "17"],
      ["Total", "32", "10", "42"],
    ]);
  });

  it("shows row, column and grand totals", async () => {
    const wrapper = await mountGrid({
      grid: { valueSource: "amount", aggregator: "sum" },
    });
    expect(
      wrapper
        .findAll("[data-slot=pivot-grid-total]")
        .map((cell) => cell.text()),
    ).toEqual(["25", "17", "32", "10", "42"]);
  });

  it("an empty intersection holds no text and is marked empty", async () => {
    const wrapper = await mountGrid();
    const empties = wrapper.findAll("[data-slot=pivot-grid-cell][data-empty]");
    expect(empties).toHaveLength(1);
    expect(empties[0]?.text()).toBe("");
    expect(
      wrapper.findAll("[data-slot=pivot-grid-cell]:not([data-empty])"),
    ).toHaveLength(3);
  });

  it("a record with no row value lands in the translated none row", async () => {
    const wrapper = await mountGrid({
      records: [...ORDERS, { id: 5, quarter: "Q2", amount: 1 }],
      messages: { "chelone.pivot_grid.no_value": "Sans region" },
    });
    expect(body(wrapper).map((cells) => cells[0])).toEqual([
      "north",
      "south",
      "Sans region",
      "Total",
    ]);
  });

  it("falls back to (none) and Total without messages", async () => {
    const wrapper = await mountGrid({ records: [{ id: 1, quarter: "Q2" }] });
    expect(body(wrapper)[0]?.[0]).toBe("(none)");
    expect(wrapper.text()).toContain("Total");
  });

  it("format replaces the default number text", async () => {
    const wrapper = await mountGrid({
      grid: { format: (value) => `${value} units` },
    });
    expect(body(wrapper)[0]).toEqual(["north", "2 units", "", "2 units"]);
  });

  it("prints numbers with the locale's grouping by default", async () => {
    const wrapper = await mountGrid({
      records: [{ id: 1, region: "a", quarter: "Q1", amount: 1234.5678 }],
      grid: { valueSource: "amount", aggregator: "sum" },
    });
    expect(body(wrapper)[0]).toEqual(["a", "1,234.57", "1,234.57"]);
  });

  it("the corner header is the translated label of rowSource", async () => {
    const wrapper = await mountGrid({
      messages: { "resources.orders.fields.region": "Sales region" },
    });
    expect(wrapper.findAll("th[scope=col]")[0]?.text()).toBe("Sales region");
  });

  it("the loading and empty slots replace the defaults", async () => {
    const slots = {
      loading: () => h("p", "Crunching"),
      empty: () => h("p", "Nothing to pivot"),
    };
    const pending = await mountGrid({
      slots,
      dataProvider: {
        ...fakeDataProvider({ orders: ORDERS }),
        getList: () => new Promise(() => {}),
      },
    });
    expect(pending.text()).toContain("Crunching");
    expect(pending.find("table").exists()).toBe(false);

    const empty = await mountGrid({ slots, records: [] });
    expect(empty.text()).toContain("Nothing to pivot");
    expect(empty.text()).not.toContain("Crunching");
    expect(empty.find("table").exists()).toBe(false);
  });

  it("renders keys that hold markup as text", async () => {
    const img = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    const wrapper = await mountGrid({
      records: [
        { id: 1, region: img, quarter: script },
        { id: 2, region: script, quarter: img },
      ],
    });
    expect(wrapper.find("table").exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find("script").exists()).toBe(false);
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(
      wrapper.findAll("th[scope=row]").map((cell) => cell.text()),
    ).toContain(img);
    expect(
      wrapper.findAll("th[scope=col]").map((cell) => cell.text()),
    ).toContain(script);
  });
});
