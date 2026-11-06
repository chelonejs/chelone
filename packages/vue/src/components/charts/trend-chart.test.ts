/**
 * `<TrendChart>` mounted the way an app uses it: inside the Chelone context,
 * with assertions on the DOM unovis draws. jsdom has no layout, so every
 * element is given a size through `getBoundingClientRect` and `ResizeObserver`
 * is a stub that never fires.
 */

import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { CurveType } from "@unovis/ts";
import {
  VisArea,
  VisAxis,
  VisCrosshair,
  VisLine,
  VisXYContainer,
} from "@unovis/vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Component, defineComponent, h } from "vue";
import { provideCheloneContext } from "../../context";
import TrendChart, { type TrendChartProps } from "./trend-chart.vue";

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

function mountChart(props: Partial<TrendChartProps<Row>> = {}) {
  const Harness = defineComponent({
    setup() {
      provideCheloneContext({
        dataProvider: fakeDataProvider({}),
        queryClient: new QueryClient(),
      });
      return () =>
        h(TrendChart<Row>, {
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

type ChartRow = { index: number; x: string; y: number | null };
type Accessor = (row: ChartRow, index: number) => string | number | null;
/** A value unovis holds in its config: a scalar, an accessor, a list. */
type PropValue = string | number | boolean | null | undefined | object;
type Template = (
  row: ChartRow,
  x: number,
  data: ChartRow[],
) => string | HTMLElement;

const isRows = (value: unknown): value is ChartRow[] => Array.isArray(value);
const isAccessor = (value: unknown): value is Accessor =>
  typeof value === "function";
const isTemplate = (value: unknown): value is Template =>
  typeof value === "function";
const isTickFormat = (
  value: unknown,
): value is (tick: number, i: number, ticks: number[]) => string =>
  typeof value === "function";

/**
 * What unovis got for one component. Its Vue wrappers declare only `data`, so
 * the other props arrive as attributes under the name the template wrote.
 */
function visProps(wrapper: VueWrapper, component: Component, nth = 0) {
  const found = wrapper.findAllComponents(component)[nth];
  if (!found) return undefined;
  const all = new Map(
    Object.entries<PropValue>({ ...found.vm.$props, ...found.vm.$attrs }),
  );
  return (name: string) =>
    all.get(name) ??
    all.get(name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
}

function required(wrapper: VueWrapper, component: Component, nth = 0) {
  const props = visProps(wrapper, component, nth);
  if (!props) throw new Error("the chart did not draw that component");
  return props;
}

function dataOf(wrapper: VueWrapper) {
  const data = required(wrapper, VisXYContainer)("data");
  if (!isRows(data)) throw new Error("the container has no rows");
  return data;
}

/** The values an accessor prop gives for each row. */
function accessedOver(wrapper: VueWrapper, component: Component, name: string) {
  const accessor = required(wrapper, component)(name);
  if (!isAccessor(accessor)) throw new Error(`${name} is not an accessor`);
  return dataOf(wrapper).map((row, i) => accessor(row, i));
}

function axis(wrapper: VueWrapper, type: "x" | "y") {
  for (const nth of [0, 1]) {
    const props = visProps(wrapper, VisAxis, nth);
    if (props?.("type") !== type) continue;
    const format = props("tickFormat");
    if (!isTickFormat(format))
      throw new Error(`the ${type} axis has no tickFormat`);
    return format;
  }
  throw new Error(`no ${type} axis`);
}

function tooltipHtml(wrapper: VueWrapper, row: ChartRow, index: number) {
  const template = required(wrapper, VisCrosshair)("template");
  if (!isTemplate(template)) throw new Error("the crosshair has no template");
  const out = template(row, index, dataOf(wrapper));
  return typeof out === "string" ? out : out.outerHTML;
}

describe("<TrendChart>", () => {
  it("draws a line through one point per row", () => {
    const wrapper = mountChart();
    expect(visProps(wrapper, VisLine)).toBeDefined();
    expect(visProps(wrapper, VisArea)).toBeUndefined();
    expect(dataOf(wrapper)).toEqual([
      { index: 0, x: "Mon", y: 3 },
      { index: 1, x: "Tue", y: 7 },
      { index: 2, x: "Wed", y: 5 },
    ]);
    expect(accessedOver(wrapper, VisLine, "x")).toEqual([0, 1, 2]);
    expect(accessedOver(wrapper, VisLine, "y")).toEqual([3, 7, 5]);
  });

  it("leaves a gap for a row with no number", () => {
    const wrapper = mountChart({
      data: [
        { day: "Mon", visits: 3 },
        { day: "Tue", visits: null },
        { day: "Wed", visits: "n/a" },
        { day: "Thu", visits: "9" },
      ],
    });
    expect(accessedOver(wrapper, VisLine, "y")).toEqual([3, null, null, 9]);
    expect(required(wrapper, VisLine)("interpolateMissingData")).toBeFalsy();
  });

  it("area draws a filled area with a gradient", () => {
    const wrapper = mountChart({ area: true });
    expect(visProps(wrapper, VisLine)).toBeUndefined();
    const defs = document.createElement("svg");
    defs.innerHTML = String(required(wrapper, VisXYContainer)("svgDefs"));
    const gradient = defs.querySelector("linearGradient");
    expect(gradient?.id).toBeTruthy();
    expect(defs.querySelectorAll("linearGradient stop")).toHaveLength(2);
    expect(accessedOver(wrapper, VisArea, "color")).toEqual(
      Array(3).fill(`url(#${gradient?.id})`),
    );
  });

  it("two areas get different gradient ids", () => {
    const id = (wrapper: VueWrapper) =>
      /id="([^"]+)"/.exec(
        String(required(wrapper, VisXYContainer)("svgDefs")),
      )?.[1];
    const first = id(mountChart({ area: true }));
    const second = id(mountChart({ area: true }));
    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
  });

  it("a hostile color stays inside its attribute in the gradient", () => {
    const color = '"><script>alert(1)</script>';
    const defs = document.createElement("svg");
    defs.innerHTML = String(
      required(mountChart({ area: true, color }), VisXYContainer)("svgDefs"),
    );
    expect(defs.querySelector("script")).toBeNull();
    expect(defs.querySelector("stop")?.getAttribute("stop-color")).toBe(color);
  });

  it("smooth uses the monotone curve", () => {
    const curve = (
      props: Partial<TrendChartProps<Row>>,
      component: Component,
    ) => required(mountChart(props), component)("curveType");
    expect(curve({}, VisLine)).toBe(CurveType.Linear);
    expect(curve({ smooth: true }, VisLine)).toBe(CurveType.MonotoneX);
    expect(curve({ area: true, smooth: true }, VisArea)).toBe(
      CurveType.MonotoneX,
    );
  });

  it("applies the tick formatters to the axes", () => {
    const wrapper = mountChart({
      xTickFormatter: (day) => `day ${day}`,
      yTickFormatter: (n) => `${n} visits`,
    });
    const x = axis(wrapper, "x");
    expect([0, 1, 2].map((i) => x(i, i, [0, 1, 2]))).toEqual([
      "day Mon",
      "day Tue",
      "day Wed",
    ]);
    expect(axis(wrapper, "y")(5, 0, [5])).toBe("5 visits");
  });

  it("labels the x ticks with the row's x when no formatter is given", () => {
    const x = axis(mountChart(), "x");
    expect(x(1, 1, [0, 1, 2])).toBe("Tue");
    // Between two rows there is no row to name.
    expect(x(1.5, 1, [0, 1, 2])).toBe("");
  });

  it("bare leaves out the card and title shows in it", () => {
    const bare = mountChart({ title: "Visits", bare: true });
    expect(bare.find('[data-slot="card"]').exists()).toBe(false);
    expect(bare.find('[data-slot="chart"]').exists()).toBe(true);

    const wrapper = mountChart({ title: "Visits" });
    const card = wrapper.get('[data-slot="card"]');
    expect(card.get('[data-slot="card-title"]').text()).toBe("Visits");
    expect(card.find('[data-slot="chart"]').exists()).toBe(true);
  });

  it("puts class on the card, or on the chart's holder when bare", () => {
    expect(
      mountChart({ class: "mine" }).get('[data-slot="card"]').classes(),
    ).toContain("mine");
    expect(
      mountChart({ class: "mine", bare: true })
        .get('[data-slot="trend-chart"]')
        .classes(),
    ).toContain("mine");
  });

  it("shows the empty text when no row has a number", () => {
    const wrapper = mountChart({
      data: [
        { day: "Mon", visits: null },
        { day: "Tue", visits: "n/a" },
      ],
    });
    expect(wrapper.get('[data-slot="chart-empty"]').text()).toBe("No data");
    expect(wrapper.find('[data-slot="chart"]').exists()).toBe(false);
  });

  it("loading shows a skeleton and no chart", () => {
    const wrapper = mountChart({ loading: true, height: 120 });
    expect(
      wrapper.get<HTMLElement>('[data-slot="skeleton"]').element.style.height,
    ).toBe("120px");
    expect(wrapper.find('[data-slot="chart"]').exists()).toBe(false);
    expect(wrapper.find('[data-slot="chart-empty"]').exists()).toBe(false);
  });

  it("the tooltip names the row, its x and its value", () => {
    const wrapper = mountChart({
      tooltipFormatter: (value, name) => `${value} ${name}`,
    });
    const html = tooltipHtml(wrapper, { index: 1, x: "Tue", y: 7 }, 1);
    expect(html).toContain("Tue");
    expect(html).toContain("visits");
    expect(html).toContain("7 visits");
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
      .map((row, i) => tooltipHtml(wrapper, row, i))
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
