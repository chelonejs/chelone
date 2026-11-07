/**
 * `<DonutChart>` mounted the way an app uses it: inside the Chelone context,
 * with assertions on what unovis was given. jsdom has no layout, so every
 * element is given a size through `getBoundingClientRect` and `ResizeObserver`
 * is a stub that never fires.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { Donut } from "@unovis/ts";
import { VisDonut, VisSingleContainer, VisTooltip } from "@unovis/vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { provideCheloneContext } from "../../context";
import { required } from "./__fixtures__/unovis";
import DonutChart, { type DonutChartProps } from "./donut-chart.vue";

type Row = { plan: string | null; seats: number | string | null };

const ROWS: Row[] = [
  { plan: "Free", seats: 10 },
  { plan: "Pro", seats: 30 },
  { plan: "Team", seats: 60 },
];

type Slice = { label: string; value: number; share: number };
type Triggers = Record<string, (arc: { data: Slice; index: number }) => string>;

const isTriggers = (value: unknown): value is Triggers =>
  typeof value === "object" && value !== null;

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

function mountChart(props: Partial<DonutChartProps<Row>> = {}) {
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({
        dataProvider: fakeDataProvider({}),
        queryClient: new QueryClient(),
      });
      return () =>
        h(DonutChart<Row>, {
          data: ROWS,
          labelField: "plan",
          valueField: "seats",
          ...props,
        });
    },
  });
  const wrapper = mount(Harness, { attachTo: document.body });
  mounted.push(wrapper);
  return wrapper;
}

function slicesOf(wrapper: VueWrapper) {
  const data = required(wrapper, VisSingleContainer)("data");
  if (!Array.isArray(data)) throw new Error("the container has no slices");
  return data;
}

/** The value and color unovis reads from each slice, as it reads them. */
function drawn(wrapper: VueWrapper) {
  const donut = required(wrapper, VisDonut);
  const value = donut("value");
  const color = donut("color");
  if (typeof value !== "function" || typeof color !== "function") {
    throw new Error("the donut has no value or color accessor");
  }
  return slicesOf(wrapper).map((slice, i) => ({
    label: slice.label,
    value: value(slice, i),
    color: color(slice, i),
  }));
}

function tooltipHtml(wrapper: VueWrapper, slice: Slice, index: number) {
  const triggers = required(wrapper, VisTooltip)("triggers");
  if (!isTriggers(triggers)) throw new Error("the tooltip has no triggers");
  const template = triggers[Donut.selectors.segment];
  if (!template) throw new Error("the tooltip has no segment trigger");
  return template({ data: slice, index });
}

describe("<DonutChart>", () => {
  it("draws a segment per positive value in the given colors", () => {
    const wrapper = mountChart({ colors: ["red", "green"] });
    // Colors cycle when there are more slices than colors.
    expect(drawn(wrapper)).toEqual([
      { label: "Free", value: 10, color: "red" },
      { label: "Pro", value: 30, color: "green" },
      { label: "Team", value: 60, color: "red" },
    ]);
  });

  it("paints every slice with its theme colour on first render", () => {
    // unovis draws each segment's fill as an inline style from this accessor.
    expect(drawn(mountChart()).map((slice) => slice.color)).toEqual([
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
    ]);
  });

  it("leaves out zero and negative values, and shows the empty text when none is left", () => {
    const wrapper = mountChart({
      data: [
        { plan: "Free", seats: 0 },
        { plan: "Pro", seats: -4 },
        { plan: "Team", seats: "8" },
        { plan: "Odd", seats: "n/a" },
        { plan: "Gap", seats: null },
      ],
    });
    expect(drawn(wrapper)).toEqual([
      { label: "Team", value: 8, color: "var(--chart-1)" },
    ]);

    const empty = mountChart({
      data: [
        { plan: "Free", seats: 0 },
        { plan: "Pro", seats: -4 },
      ],
    });
    expect(empty.get('[data-slot="chart-empty"]').text()).toBe("No data");
    expect(empty.find('[data-slot="chart"]').exists()).toBe(false);
  });

  it("bare, loading and the title behave as in TrendChart", () => {
    const bare = mountChart({ title: "Plans", bare: true });
    expect(bare.find('[data-slot="card"]').exists()).toBe(false);
    expect(bare.find('[data-slot="chart"]').exists()).toBe(true);

    const titled = mountChart({ title: "Plans", class: "mine" });
    const card = titled.get('[data-slot="card"]');
    expect(card.classes()).toContain("mine");
    expect(card.get('[data-slot="card-title"]').text()).toBe("Plans");

    expect(
      mountChart({ class: "mine", bare: true })
        .get('[data-slot="donut-chart"]')
        .classes(),
    ).toContain("mine");

    const loading = mountChart({ loading: true, height: 120 });
    expect(
      loading.get<HTMLElement>('[data-slot="skeleton"]').element.style.height,
    ).toBe("120px");
    expect(loading.find('[data-slot="chart"]').exists()).toBe(false);
  });

  it("the tooltip names the slice and its value in the slice's color", () => {
    const wrapper = mountChart({ colors: ["red", "green"] });
    const html = tooltipHtml(
      wrapper,
      { label: "Pro", value: 30, share: 0.3 },
      1,
    );
    expect(html).toContain("Pro");
    expect(html).toContain("30");
    expect(html).toContain("green");
  });

  it("the tooltip renders labels that hold markup as text", () => {
    const payload = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    const wrapper = mountChart({
      title: script,
      data: [
        { plan: payload, seats: 1 },
        { plan: script, seats: 2 },
      ],
    });
    const html = slicesOf(wrapper)
      .map((slice, i) => tooltipHtml(wrapper, slice, i))
      .join("");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;script");
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find("script").exists()).toBe(false);
    expect(wrapper.get('[data-slot="card-title"]').text()).toBe(script);
  });

  it("keeps labels out of the page's styles", () => {
    const wrapper = mountChart({
      data: [
        { plan: "x: red;} body{display:none} a{", seats: 1 },
        { plan: "</style><img src=x onerror=alert(1)>", seats: 2 },
      ],
    });
    expect(wrapper.find("img").exists()).toBe(false);
    const css = [...document.querySelectorAll("style")]
      .map((style) => style.textContent)
      .join("");
    expect(css).not.toContain("body{display:none}");
    expect(css).not.toContain("<img");
  });
});
