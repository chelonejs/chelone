/**
 * `<PivotGrid>`: the records of the ambient `<List>` as a pivot table. Mounted
 * as `<MemoryRouter><Admin><Resource list/></Admin></MemoryRouter>` (the app's
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
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { Admin } from "../../../admin/admin";
import { Resource } from "../../../resource";
import { List } from "../views/list";
import { PivotGrid, type PivotGridProps } from "./pivot-grid";

afterEach(cleanup);

const ORDERS = [
  { id: 1, region: "south", quarter: "Q10", amount: 10 },
  { id: 2, region: "north", quarter: "Q2", amount: 20 },
  { id: 3, region: "north", quarter: "Q2", amount: 5 },
  { id: 4, region: "south", quarter: "Q2", amount: 7 },
];

function mount({
  grid = {},
  records = ORDERS,
  dataProvider = fakeDataProvider({ orders: records }),
  messages = {},
}: {
  grid?: Partial<PivotGridProps>;
  records?: LooseRecord[];
  dataProvider?: DataProvider;
  messages?: Record<string, string>;
} = {}) {
  const list = () => (
    <List perPage={1000}>
      <PivotGrid rowSource="region" columnSource="quarter" {...grid} />
    </List>
  );
  return render(
    <MemoryRouter initialEntries={["/orders"]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
        i18n={createI18n({
          locale: "en",
          messages: { en: defineMessages(messages) },
        })}
        notifications={createNotificationStore()}
      >
        <Resource name="orders" list={list} />
      </Admin>
    </MemoryRouter>,
  );
}

const grid = () => screen.findByRole("table");
/** Each body row as its row header and then its cells' text. */
const body = () =>
  Array.from(document.querySelectorAll("tbody tr")).map((tr) =>
    Array.from(tr.children).map((cell) => cell.textContent),
  );
const text = (elements: HTMLElement[]) =>
  elements.map((element) => element.textContent);

describe("<PivotGrid>", () => {
  it("renders a row per row key and a column per column key, sorted", async () => {
    mount();
    const table = within(await grid());
    expect(text(table.getAllByRole("columnheader"))).toEqual([
      "Region",
      "Q2",
      "Q10",
      "Total",
    ]);
    expect(
      text(
        table
          .getAllByRole("rowheader")
          .filter((cell) => cell.getAttribute("scope") === "row"),
      ),
    ).toEqual(["north", "south", "Total"]);
  });

  it("counts records per cell by default", async () => {
    mount();
    await grid();
    expect(body()).toEqual([
      ["north", "2", "", "2"],
      ["south", "1", "1", "2"],
      ["Total", "3", "1", "4"],
    ]);
  });

  it("sums the value source with aggregator sum", async () => {
    mount({ grid: { valueSource: "amount", aggregator: "sum" } });
    await grid();
    expect(body()).toEqual([
      ["north", "25", "", "25"],
      ["south", "7", "10", "17"],
      ["Total", "32", "10", "42"],
    ]);
  });

  it("shows row, column and grand totals", async () => {
    mount({ grid: { valueSource: "amount", aggregator: "sum" } });
    await grid();
    const totals = Array.from(
      document.querySelectorAll("[data-slot=pivot-grid-total]"),
    ).map((cell) => cell.textContent);
    expect(totals).toEqual(["25", "17", "32", "10", "42"]);
  });

  it("an empty intersection holds no text and is marked empty", async () => {
    mount();
    await grid();
    const empties = document.querySelectorAll(
      "[data-slot=pivot-grid-cell][data-empty]",
    );
    expect(empties).toHaveLength(1);
    expect(empties[0]?.textContent).toBe("");
    expect(
      document.querySelectorAll(
        "[data-slot=pivot-grid-cell]:not([data-empty])",
      ),
    ).toHaveLength(3);
  });

  it("a record with no row value lands in the translated none row", async () => {
    mount({
      records: [...ORDERS, { id: 5, quarter: "Q2", amount: 1 }],
      messages: { "chelone.pivot_grid.no_value": "Sans region" },
    });
    await grid();
    expect(body().map((cells) => cells[0])).toEqual([
      "north",
      "south",
      "Sans region",
      "Total",
    ]);
  });

  it("falls back to (none) and Total without messages", async () => {
    mount({ records: [{ id: 1, quarter: "Q2" }] });
    await grid();
    expect(body()[0]?.[0]).toBe("(none)");
    expect(screen.getAllByText("Total").length).toBeGreaterThan(0);
  });

  it("format replaces the default number text", async () => {
    mount({ grid: { format: (value) => `${value} units` } });
    await grid();
    expect(body()[0]).toEqual(["north", "2 units", "", "2 units"]);
  });

  it("prints numbers with the locale's grouping by default", async () => {
    mount({
      records: [{ id: 1, region: "a", quarter: "Q1", amount: 1234.5678 }],
      grid: { valueSource: "amount", aggregator: "sum" },
    });
    await grid();
    expect(body()[0]).toEqual(["a", "1,234.57", "1,234.57"]);
  });

  it("the corner header is the translated label of rowSource", async () => {
    mount({ messages: { "resources.orders.fields.region": "Sales region" } });
    const table = within(await grid());
    expect(table.getAllByRole("columnheader")[0]?.textContent).toBe(
      "Sales region",
    );
  });

  it("shows the loading node while pending and the empty node with no records", async () => {
    const pending = fakeDataProvider({ orders: ORDERS });
    mount({
      grid: { loading: <p>Crunching</p>, empty: <p>Nothing to pivot</p> },
      dataProvider: {
        ...pending,
        getList: () => new Promise(() => {}),
      },
    });
    expect(await screen.findByText("Crunching")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    cleanup();

    mount({
      grid: { loading: <p>Crunching</p>, empty: <p>Nothing to pivot</p> },
      records: [],
    });
    expect(await screen.findByText("Nothing to pivot")).toBeTruthy();
    expect(screen.queryByText("Crunching")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders keys that hold markup as text", async () => {
    const img = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    mount({
      records: [
        { id: 1, region: img, quarter: script },
        { id: 2, region: script, quarter: img },
      ],
    });
    const table = await grid();
    expect(table.querySelector("img")).toBeNull();
    expect(table.querySelector("script")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(
      within(table).getByText(img, { selector: "th[scope=row]" }),
    ).toBeTruthy();
    expect(
      within(table).getByText(script, { selector: "th[scope=col]" }),
    ).toBeTruthy();
  });
});
