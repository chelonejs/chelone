/**
 * `<BarChart>` mounted the way the demos use it: as a resource page inside
 * `<Admin>`, with assertions on the DOM recharts draws. jsdom measures every
 * element as 0x0, so `ResponsiveContainer` is replaced by one that hands its
 * chart a size.
 */
import { defineResources, fakeDataProvider } from "@chelone/core";
import { cleanup } from "@testing-library/react";
import { cloneElement, isValidElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { mountInAdmin } from "./__fixtures__/admin-mount";
import { BarChart, type BarChartProps } from "./bar-chart";

vi.mock("recharts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("recharts")>()),
  ResponsiveContainer: ({ children }: { children?: ReactNode }) =>
    isValidElement<{ width?: number; height?: number }>(children)
      ? cloneElement(children, { width: 400, height: 200 })
      : children,
}));

afterEach(cleanup);

type Row = { day: string; visits: number | string | null };

const ROWS: Row[] = [
  { day: "Mon", visits: 3 },
  { day: "Tue", visits: 7 },
  { day: "Wed", visits: 5 },
];

const resources = defineResources({
  posts: {
    schema: z.object({ day: z.string(), visits: z.number() }),
  },
});

/** The chart as the `posts` list page, inside `<Admin>`. */
function mount(props: Partial<BarChartProps<Row>> = {}) {
  return mountInAdmin({
    name: "posts",
    resources,
    dataProvider: fakeDataProvider({ posts: [] }),
    page: () => (
      <BarChart data={ROWS} xField="day" yField="visits" {...props} />
    ),
  });
}

/** How each drawn bar is filled: the attribute recharts writes and the style that paints. */
function barFills(container: HTMLElement) {
  return [
    ...container.querySelectorAll<SVGPathElement>(
      ".recharts-bar-rectangle path",
    ),
  ].map((bar) => ({
    attribute: bar.getAttribute("fill"),
    style: bar.style.fill,
  }));
}

describe("<BarChart>", () => {
  it("draws a bar per row with a number", () => {
    const { container } = mount({
      data: [
        { day: "Mon", visits: 3 },
        { day: "Tue", visits: null },
        { day: "Wed", visits: "n/a" },
        { day: "Thu", visits: "9" },
      ],
    });
    const bars = container.querySelectorAll(".recharts-bar-rectangle path");
    expect(bars).toHaveLength(2);
    // Rounded top corners draw arcs; a plain rectangle has none.
    for (const bar of bars) expect(bar.getAttribute("d")).toContain("A");
    const xTicks = [
      ...container.querySelectorAll('text[orientation="bottom"]'),
    ].map((t) => t.textContent);
    expect(xTicks).toEqual(["Mon", "Tue", "Wed", "Thu"]);
  });

  it("fills every bar with the given color", () => {
    const { container } = mount({ color: "red" });
    expect(barFills(container)).toEqual([
      { attribute: "red", style: "red" },
      { attribute: "red", style: "red" },
      { attribute: "red", style: "red" },
    ]);
  });

  it("gives each bar a different theme colour by default", () => {
    const { container } = mount();
    // recharts writes the attribute; the style is the declaration that paints.
    expect(barFills(container)).toEqual([
      { attribute: "var(--chart-1)", style: "var(--chart-1)" },
      { attribute: "var(--chart-2)", style: "var(--chart-2)" },
      { attribute: "var(--chart-3)", style: "var(--chart-3)" },
    ]);
  });

  it("cycles the given colors over the bars", () => {
    const { container } = mount({ colors: ["red", "green"] });
    expect(barFills(container).map((bar) => bar.attribute)).toEqual([
      "red",
      "green",
      "red",
    ]);
  });

  it("bare, loading and the empty text behave as in TrendChart", () => {
    const bare = mount({ title: "Visits", bare: true });
    expect(bare.container.querySelector('[data-slot="card"]')).toBeNull();
    expect(bare.container.querySelector('[data-slot="chart"]')).not.toBeNull();
    cleanup();

    const titled = mount({ title: "Visits" });
    const card = titled.container.querySelector('[data-slot="card"]');
    expect(card?.querySelector('[data-slot="card-title"]')?.textContent).toBe(
      "Visits",
    );
    expect(card?.querySelector('[data-slot="chart"]')).not.toBeNull();
    cleanup();

    const loading = mount({ loading: true, height: 120 });
    const skeleton = loading.container.querySelector<HTMLElement>(
      '[data-slot="skeleton"]',
    );
    expect(skeleton?.style.height).toBe("120px");
    expect(loading.container.querySelector('[data-slot="chart"]')).toBeNull();
    cleanup();

    const empty = mount({
      data: [
        { day: "Mon", visits: null },
        { day: "Tue", visits: "n/a" },
      ],
    });
    expect(
      empty.container.querySelector('[data-slot="chart-empty"]')?.textContent,
    ).toBe("No data");
    expect(empty.container.querySelector('[data-slot="chart"]')).toBeNull();
  });

  it("renders x values that hold markup as text", () => {
    const payload = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    const { container } = mount({
      data: [
        { day: payload, visits: 1 },
        { day: script, visits: 2 },
      ],
    });
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    const labels = [
      ...container.querySelectorAll('text[orientation="bottom"]'),
    ].map((t) => t.textContent);
    expect(labels).toEqual([payload, script]);
  });
});
