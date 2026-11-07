/**
 * `<DonutChart>` mounted the way the demos use it: as a resource page inside
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
import { DonutChart, type DonutChartProps } from "./donut-chart";

vi.mock("recharts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("recharts")>()),
  ResponsiveContainer: ({ children }: { children?: ReactNode }) =>
    isValidElement<{ width?: number; height?: number }>(children)
      ? cloneElement(children, { width: 400, height: 200 })
      : children,
}));

afterEach(cleanup);

type Row = { plan: string | null; seats: number | string | null };

const ROWS: Row[] = [
  { plan: "Free", seats: 10 },
  { plan: "Pro", seats: 30 },
  { plan: "Team", seats: 60 },
];

const resources = defineResources({
  plans: {
    schema: z.object({ plan: z.string(), seats: z.number() }),
  },
});

/** The chart as the `plans` list page, inside `<Admin>`. */
function mount(props: Partial<DonutChartProps<Row>> = {}) {
  return mountInAdmin({
    name: "plans",
    resources,
    dataProvider: fakeDataProvider({ plans: [] }),
    page: () => (
      <DonutChart data={ROWS} labelField="plan" valueField="seats" {...props} />
    ),
  });
}

function sectorFills(container: HTMLElement) {
  return [...container.querySelectorAll(".recharts-pie-sector path")].map(
    (path) => path.getAttribute("fill"),
  );
}

/** The fill each sector paints with: its inline style, which outranks the attribute. */
function paintedFills(container: HTMLElement) {
  return [
    ...container.querySelectorAll<SVGPathElement>(".recharts-pie-sector path"),
  ].map((path) => path.style.fill);
}

describe("<DonutChart>", () => {
  it("draws a slice per positive value in the given colors", () => {
    const { container } = mount({ colors: ["red", "green"] });
    // Colors cycle when there are more slices than colors.
    expect(sectorFills(container)).toEqual(["red", "green", "red"]);
  });

  it("paints every slice with its theme colour on first render", () => {
    const { container } = mount();
    const theme = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
    expect(sectorFills(container)).toEqual(theme);
    // recharts writes the attribute; the style is the declaration that paints.
    expect(paintedFills(container)).toEqual(theme);
  });

  it("leaves out zero and negative values, and shows the empty text when none is left", () => {
    const { container } = mount({
      data: [
        { plan: "Free", seats: 0 },
        { plan: "Pro", seats: -4 },
        { plan: "Team", seats: "8" },
        { plan: "Odd", seats: "n/a" },
        { plan: "Gap", seats: null },
      ],
    });
    expect(sectorFills(container)).toHaveLength(1);
    cleanup();

    const empty = mount({
      data: [
        { plan: "Free", seats: 0 },
        { plan: "Pro", seats: -4 },
      ],
    });
    expect(
      empty.container.querySelector('[data-slot="chart-empty"]')?.textContent,
    ).toBe("No data");
    expect(empty.container.querySelector('[data-slot="chart"]')).toBeNull();
  });

  it("bare and loading behave as in TrendChart", () => {
    const bare = mount({ title: "Plans", bare: true });
    expect(bare.container.querySelector('[data-slot="card"]')).toBeNull();
    expect(bare.container.querySelector('[data-slot="chart"]')).not.toBeNull();
    cleanup();

    const titled = mount({ title: "Plans" });
    const card = titled.container.querySelector('[data-slot="card"]');
    expect(card?.querySelector('[data-slot="card-title"]')?.textContent).toBe(
      "Plans",
    );
    cleanup();

    const loading = mount({ loading: true, height: 120 });
    const skeleton = loading.container.querySelector<HTMLElement>(
      '[data-slot="skeleton"]',
    );
    expect(skeleton?.style.height).toBe("120px");
    expect(loading.container.querySelector('[data-slot="chart"]')).toBeNull();
  });

  it("renders labels that hold markup as text", () => {
    const payload = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    const { container } = mount({
      title: script,
      data: [
        { plan: payload, seats: 1 },
        { plan: script, seats: 2 },
      ],
    });
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(sectorFills(container)).toHaveLength(2);
    expect(
      container.querySelector('[data-slot="card-title"]')?.textContent,
    ).toBe(script);
  });

  it("keeps labels out of the page's styles", () => {
    const { container } = mount({
      data: [
        { plan: "x: red;} body{display:none} a{", seats: 1 },
        { plan: "</style><img src=x onerror=alert(1)>", seats: 2 },
      ],
    });
    expect(container.querySelector("img")).toBeNull();
    const css = [...container.querySelectorAll("style")]
      .map((style) => style.textContent)
      .join("");
    expect(css).not.toContain("body{display:none}");
    expect(css).not.toContain("<img");
    expect(sectorFills(container)).toHaveLength(2);
  });

  it("draws a slice for each row when labels repeat or are missing", () => {
    const { container } = mount({
      data: [
        { plan: "Pro", seats: 1 },
        { plan: "Pro", seats: 2 },
        { plan: null, seats: 3 },
        { plan: null, seats: 4 },
      ],
    });
    expect(sectorFills(container)).toEqual([
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
    ]);
  });
});
