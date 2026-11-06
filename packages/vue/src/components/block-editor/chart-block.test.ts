/**
 * The chart block mounted in a block editor, with assertions on the SVG unovis
 * draws. jsdom has no layout, so every element is given a size and the SVG
 * text measures are stubbed.
 */
import {
  type BlockAttrs,
  fakeDataProvider,
  type ResourceDefinition,
} from "@chelone/core";
import { Axis, Donut, GroupedBar } from "@unovis/ts";
import { flushPromises } from "@vue/test-utils";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  doc,
  mountBlockEditor,
  stubLayout,
  unmountAll,
} from "./__fixtures__/block-editor-harness";
import { chartBlock } from "./data-blocks";

// unovis picks `globalThis.ResizeObserver` when its module loads, so the stub
// goes in before the imports run.
vi.hoisted(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

beforeAll(stubLayout);

beforeEach(() => {
  // jsdom has no SVG text layout, which unovis reads to wrap axis labels.
  Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    value: () => 0,
  });
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => new DOMRect(0, 0, 0, 0),
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 400, 200),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  unmountAll();
});

type Post = { id: number; status: string; views: number };

const posts: Post[] = [
  { id: 1, status: "draft", views: 12 },
  { id: 2, status: "live", views: 3 },
  { id: 3, status: "live", views: 7 },
];

const resources: ResourceDefinition[] = [
  {
    name: "posts",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  },
];

async function mount(attrs: BlockAttrs, rows: Post[] = posts) {
  const mounted = await mountBlockEditor(
    { blocks: [chartBlock] },
    {
      body: doc({ type: "chart", attrs }),
      dataProvider: fakeDataProvider({ posts: rows }),
      resources,
    },
  );
  await flushPromises();
  return mounted;
}

const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`);

const alert = () => document.querySelector('[role="alert"]');

const all = (selector: string) => [...document.querySelectorAll(selector)];

const ticks = (axis: "x" | "y") =>
  all(`[axis-type="${axis}"] .${Axis.selectors.tick} text`).map(
    (tick) => tick.textContent,
  );

describe("chart block", () => {
  it("renders BarChart, TrendChart or DonutChart for the type, with the aggregated rows", async () => {
    const base = { resource: "posts", category: "status", value: "views" };

    await mount({ ...base, type: "bar", aggregate: "sum" });
    await expect.poll(() => slot("bar-chart")).not.toBeNull();
    await expect.poll(() => ticks("x")).toEqual(["draft", "live"]);
    expect(all(`.${GroupedBar.selectors.bar}`)).toHaveLength(2);
    // Draft sums to 12, so the y axis reaches past 10.
    expect(ticks("y")).toContain("10");
    expect(slot("trend-chart")).toBeNull();
    expect(slot("donut-chart")).toBeNull();
    unmountAll();

    await mount({ ...base, type: "line", aggregate: "count" });
    await expect.poll(() => slot("trend-chart")).not.toBeNull();
    await expect.poll(() => ticks("x")).toEqual(["draft", "live"]);
    // Two live posts is the highest count.
    expect(ticks("y")).toContain("2");
    expect(slot("bar-chart")).toBeNull();
    unmountAll();

    await mount({ ...base, type: "pie", aggregate: "avg" });
    await expect.poll(() => slot("donut-chart")).not.toBeNull();
    await expect.poll(() => all(`.${Donut.selectors.segment}`)).toHaveLength(2);
    expect(slot("bar-chart")).toBeNull();
    // Bare: no card around the chart.
    expect(document.querySelector('[data-slot="card"]')).toBeNull();
  });

  it("shows the empty state until a resource and category are set", async () => {
    await mount({ resource: "posts", category: "" });
    expect(document.body.textContent).toContain(
      "Choose a resource and a category",
    );
    expect(slot("bar-chart")).toBeNull();
    unmountAll();

    await mount({ resource: "", category: "status" });
    expect(document.body.textContent).toContain(
      "Choose a resource and a category",
    );
    unmountAll();

    // Configured, but nothing to draw: the chart's own empty text, not the block's.
    await mount({
      resource: "posts",
      category: "status",
      value: "missing",
      type: "pie",
      aggregate: "sum",
    });
    await expect.poll(() => slot("chart-empty")?.textContent).toBe("No data");
    expect(document.body.textContent).not.toContain(
      "Choose a resource and a category",
    );
  });

  it("shows the error state when the rows cannot be read", async () => {
    await mount({ resource: "ghosts", category: "status" });
    await expect
      .poll(() => alert()?.textContent)
      .toBe("The chart data could not be loaded");
  });

  it("a category with markup renders as text", async () => {
    const markup = "<img src=x onerror=alert(1)>";
    await mount({ resource: "posts", category: "status", type: "bar" }, [
      { id: 1, status: markup, views: 1 },
    ]);
    await expect.poll(() => ticks("x")).toEqual([markup]);
    expect(document.querySelector("img")).toBeNull();
  });
});
