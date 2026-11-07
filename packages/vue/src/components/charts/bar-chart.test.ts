/**
 * `<BarChart>` mounted the way an app uses it: inside the Chelone context,
 * with assertions on what unovis was given. jsdom has no layout, so every
 * element is given a size through `getBoundingClientRect` and `ResizeObserver`
 * is a stub that never fires.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import {
  VisAxis,
  VisCrosshair,
  VisGroupedBar,
  VisXYContainer,
} from "@unovis/vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { provideCheloneContext } from "../../context";
import { axis, chartReaders, required } from "./__fixtures__/unovis";
import BarChart, { type BarChartProps } from "./bar-chart.vue";

const { dataOf, accessedOver, tooltipHtml } = chartReaders(VisXYContainer);

type Row = { day: string; visits: number | string | null };

const ROWS: Row[] = [
  { day: "Mon", visits: 3 },
  { day: "Tue", visits: 7 },
  { day: "Wed", visits: 5 },
];

const mounted: VueWrapper[] = [];

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

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 400, 200),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

function mountChart(props: Partial<BarChartProps<Row>> = {}) {
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({
        dataProvider: fakeDataProvider({}),
        queryClient: new QueryClient(),
      });
      return () =>
        h(BarChart<Row>, {
          data: ROWS,
          xField: "day",
          yField: "visits",
          ...props,
        });
    },
  });
  const wrapper = mount(Harness, { attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}

describe("<BarChart>", () => {
  it("draws a bar per row with a number", () => {
    const wrapper = mountChart({
      data: [
        { day: "Mon", visits: 3 },
        { day: "Tue", visits: null },
        { day: "Wed", visits: "n/a" },
        { day: "Thu", visits: "9" },
      ],
    });
    expect(dataOf(wrapper)).toEqual([
      { index: 0, x: "Mon", y: 3 },
      { index: 1, x: "Tue", y: null },
      { index: 2, x: "Wed", y: null },
      { index: 3, x: "Thu", y: 9 },
    ]);
    expect(accessedOver(wrapper, VisGroupedBar, "x")).toEqual([0, 1, 2, 3]);
    // A null y draws no bar, so unovis may not pad it to a minimum height.
    expect(required(wrapper, VisGroupedBar)("barMinHeight")).toBe(0);
    expect(accessedOver(wrapper, VisGroupedBar, "y")).toEqual([
      3,
      null,
      null,
      9,
    ]);
    expect(required(wrapper, VisGroupedBar)("roundedCorners")).toBeTruthy();
    const xAxis = axis(wrapper, VisAxis, "x");
    expect([0, 1, 2, 3].map((i) => xAxis(i, i, [0, 1, 2, 3]))).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
    ]);
    // Between two rows there is no row to name.
    expect(xAxis(1.5, 1, [0, 1, 2, 3])).toBe("");
  });

  it("fills the bars with the given color", () => {
    const wrapper = mountChart({ color: "red" });
    expect(accessedOver(wrapper, VisGroupedBar, "color")).toEqual(
      Array(3).fill("red"),
    );
  });

  it("gives each bar a different theme colour by default", () => {
    expect(accessedOver(mountChart(), VisGroupedBar, "color")).toEqual([
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
    ]);
  });

  it("cycles the given colors over the bars", () => {
    const wrapper = mountChart({ colors: ["red", "green"] });
    expect(accessedOver(wrapper, VisGroupedBar, "color")).toEqual([
      "red",
      "green",
      "red",
    ]);
  });

  it("bare, loading and the empty text behave as in TrendChart", () => {
    const bare = mountChart({ title: "Visits", bare: true });
    expect(bare.find('[data-slot="card"]').exists()).toBe(false);
    expect(bare.find('[data-slot="chart"]').exists()).toBe(true);

    const titled = mountChart({ title: "Visits", class: "mine" });
    const card = titled.get('[data-slot="card"]');
    expect(card.classes()).toContain("mine");
    expect(card.get('[data-slot="card-title"]').text()).toBe("Visits");
    expect(card.find('[data-slot="chart"]').exists()).toBe(true);

    expect(
      mountChart({ class: "mine", bare: true })
        .get('[data-slot="bar-chart"]')
        .classes(),
    ).toContain("mine");

    const loading = mountChart({ loading: true, height: 120 });
    expect(
      loading.get<HTMLElement>('[data-slot="skeleton"]').element.style.height,
    ).toBe("120px");
    expect(loading.find('[data-slot="chart"]').exists()).toBe(false);

    const empty = mountChart({
      data: [
        { day: "Mon", visits: null },
        { day: "Tue", visits: "n/a" },
      ],
    });
    expect(empty.get('[data-slot="chart-empty"]').text()).toBe("No data");
    expect(empty.find('[data-slot="chart"]').exists()).toBe(false);
  });

  it("the tooltip names the row, its x and its value", () => {
    const wrapper = mountChart();
    const html = tooltipHtml(
      wrapper,
      VisCrosshair,
      { index: 1, x: "Tue", y: 7 },
      1,
    );
    expect(html).toContain("Tue");
    expect(html).toContain("visits");
    expect(html).toContain("7");
    // The indicator is the second bar's own color, not one color for all rows.
    expect(html).toContain("var(--chart-2)");
  });

  it("the tooltip renders x values that hold markup as text", () => {
    const payload = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    const wrapper = mountChart({
      title: script,
      data: [
        { day: payload, visits: 1 },
        { day: script, visits: 2 },
      ],
    });
    const html = dataOf(wrapper)
      .map((row, i) => tooltipHtml(wrapper, VisCrosshair, row, i))
      .join("");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;script");
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find("script").exists()).toBe(false);
    expect(wrapper.get('[data-slot="card-title"]').text()).toBe(script);
  });
});
