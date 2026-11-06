/**
 * `<BarChart>` mounted the way an app uses it: inside the Chelone provider,
 * with assertions on the DOM recharts draws. jsdom measures every element as
 * 0x0, so `ResponsiveContainer` is replaced by one that hands its chart a size.
 */
import { createStore, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { cloneElement, isValidElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../context";
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

function mount(props: Partial<BarChartProps<Row>> = {}) {
  return render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      store={createStore()}
    >
      <BarChart data={ROWS} xField="day" yField="visits" {...props} />
    </CheloneProvider>,
  );
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

  it("fills the bars with the given color", () => {
    const { container } = mount({ color: "red" });
    const bar = container.querySelector(".recharts-bar-rectangle path");
    expect(bar?.getAttribute("fill")).toBe("red");
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
