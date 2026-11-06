/**
 * `<TrendChart>` mounted the way an app uses it: inside the Chelone provider,
 * with assertions on the DOM recharts draws. jsdom measures every element as
 * 0x0, so `ResponsiveContainer` is replaced by one that hands its chart a size.
 */
import { createStore, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { cloneElement, isValidElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
import { TrendChart, type TrendChartProps } from "./trend-chart";

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

function mount(props: Partial<TrendChartProps<Row>> = {}) {
  return render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      store={createStore()}
    >
      <TrendChart data={ROWS} xField="day" yField="visits" {...props} />
    </CheloneProvider>,
  );
}

describe("<TrendChart>", () => {
  it("draws a line through one point per row", () => {
    const { container } = mount();
    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(1);
    expect(container.querySelectorAll(".recharts-line-dot")).toHaveLength(3);
  });

  it("leaves a gap for a row with no number", () => {
    const { container } = mount({
      data: [
        { day: "Mon", visits: 3 },
        { day: "Tue", visits: null },
        { day: "Wed", visits: "n/a" },
        { day: "Thu", visits: "9" },
      ],
    });
    expect(container.querySelectorAll(".recharts-line-dot")).toHaveLength(2);
    // A gap splits the curve into two sub-paths, each starting with `M`.
    const path = container
      .querySelector(".recharts-line-curve")
      ?.getAttribute("d");
    expect(path?.match(/M/g)).toHaveLength(2);
  });

  it("area draws a filled area with a gradient", () => {
    const { container } = mount({ area: true });
    expect(container.querySelector(".recharts-line")).toBeNull();
    const area = container.querySelector(".recharts-area-area");
    const gradient = container.querySelector("linearGradient");
    expect(gradient?.id).toBeTruthy();
    expect(area?.getAttribute("fill")).toBe(`url(#${gradient?.id})`);
    expect(container.querySelectorAll("linearGradient stop")).toHaveLength(2);
  });

  it("smooth draws a curve and its absence draws straight segments", () => {
    const straight = mount().container.querySelector(".recharts-line-curve");
    const curved = mount({ smooth: true }).container.querySelector(
      ".recharts-line-curve",
    );
    expect(straight?.getAttribute("d")).not.toContain("C");
    expect(curved?.getAttribute("d")).toContain("C");
  });

  it("applies the tick formatters to the axis labels", () => {
    const { container } = mount({
      xTickFormatter: (day) => `day ${day}`,
      yTickFormatter: (n) => `${n} visits`,
    });
    const xTicks = [
      ...container.querySelectorAll('text[orientation="bottom"]'),
    ].map((t) => t.textContent);
    const yTicks = [
      ...container.querySelectorAll('text[orientation="left"]'),
    ].map((t) => t.textContent);
    expect(xTicks).toEqual(["day Mon", "day Tue", "day Wed"]);
    expect(yTicks.length).toBeGreaterThan(0);
    expect(yTicks.every((t) => t?.endsWith(" visits"))).toBe(true);
  });

  it("bare leaves out the card and title shows in it", () => {
    const bare = mount({ title: "Visits", bare: true });
    expect(bare.container.querySelector('[data-slot="card"]')).toBeNull();
    expect(bare.container.querySelector('[data-slot="chart"]')).not.toBeNull();
    cleanup();

    const { container } = mount({ title: "Visits" });
    const card = container.querySelector('[data-slot="card"]');
    expect(card?.querySelector('[data-slot="card-title"]')?.textContent).toBe(
      "Visits",
    );
    expect(card?.querySelector('[data-slot="chart"]')).not.toBeNull();
  });

  it("shows the empty text when no row has a number", () => {
    const { container } = mount({
      data: [
        { day: "Mon", visits: null },
        { day: "Tue", visits: "n/a" },
      ],
    });
    expect(
      container.querySelector('[data-slot="chart-empty"]')?.textContent,
    ).toBe("No data");
    expect(container.querySelector('[data-slot="chart"]')).toBeNull();
  });

  it("loading shows a skeleton and no chart", () => {
    const { container } = mount({ loading: true, height: 120 });
    const skeleton = container.querySelector<HTMLElement>(
      '[data-slot="skeleton"]',
    );
    expect(skeleton?.style.height).toBe("120px");
    expect(container.querySelector('[data-slot="chart"]')).toBeNull();
    expect(container.querySelector('[data-slot="chart-empty"]')).toBeNull();
  });

  it("renders x values and a title that hold markup as text", () => {
    const payload = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    const { container } = mount({
      title: script,
      data: [
        { day: payload, visits: 1 },
        { day: script, visits: 2 },
      ],
    });
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(
      container.querySelector('[data-slot="card-title"]')?.textContent,
    ).toBe(script);
    const labels = [
      ...container.querySelectorAll('text[orientation="bottom"]'),
    ].map((t) => t.textContent);
    expect(labels).toEqual([payload, script]);
  });
});
