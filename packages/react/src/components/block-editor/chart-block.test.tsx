/**
 * The chart block mounted in a block editor, with assertions on the DOM
 * recharts draws. jsdom measures every element as 0x0, so `ResponsiveContainer`
 * is replaced by one that hands its chart a size.
 */
import {
  type BlockAttrs,
  createResourceRegistry,
  fakeDataProvider,
} from "@chelone/core";
import { cleanup, screen } from "@testing-library/react";
import { cloneElement, isValidElement, type ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  doc,
  mountBlockEditor,
  stubLayout,
} from "./__fixtures__/block-editor-harness";
import { chartBlock } from "./chart-block";

vi.mock("recharts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("recharts")>()),
  ResponsiveContainer: ({ children }: { children?: ReactNode }) =>
    isValidElement<{ width?: number; height?: number }>(children)
      ? cloneElement(children, { width: 400, height: 200 })
      : children,
}));

beforeAll(stubLayout);
afterEach(() => cleanup());

const posts = [
  { id: 1, status: "draft", views: 12 },
  { id: 2, status: "live", views: 3 },
  { id: 3, status: "live", views: 7 },
];

async function mount(
  attrs: BlockAttrs,
  rows: { id: number; status: string; views: number }[] = posts,
) {
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  });
  return mountBlockEditor(
    { blocks: [chartBlock] },
    {
      defaultValues: { body: doc({ type: "chart", attrs }) },
      dataProvider: fakeDataProvider({ posts: rows }),
      registry,
    },
  );
}

const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`);

const ticks = (orientation: "bottom" | "left") =>
  [...document.querySelectorAll(`text[orientation="${orientation}"]`)].map(
    (tick) => tick.textContent,
  );

describe("chart block", () => {
  it("renders BarChart, TrendChart or DonutChart for the type, with the aggregated rows", async () => {
    const base = { resource: "posts", category: "status", value: "views" };

    await mount({ ...base, type: "bar", aggregate: "sum" });
    await vi.waitFor(() => expect(slot("bar-chart")).not.toBeNull());
    await vi.waitFor(() =>
      expect(document.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(
        2,
      ),
    );
    expect(ticks("bottom")).toEqual(["draft", "live"]);
    expect(slot("trend-chart")).toBeNull();
    expect(slot("donut-chart")).toBeNull();
    cleanup();

    await mount({ ...base, type: "line", aggregate: "count" });
    await vi.waitFor(() =>
      expect(document.querySelectorAll(".recharts-line-dot")).toHaveLength(2),
    );
    expect(slot("trend-chart")).not.toBeNull();
    expect(ticks("bottom")).toEqual(["draft", "live"]);
    // Two live posts is the highest count.
    expect(ticks("left")).toContain("2");
    expect(slot("bar-chart")).toBeNull();
    cleanup();

    await mount({ ...base, type: "pie", aggregate: "avg" });
    await vi.waitFor(() =>
      expect(document.querySelectorAll(".recharts-pie-sector")).toHaveLength(2),
    );
    expect(slot("donut-chart")).not.toBeNull();
    expect(slot("bar-chart")).toBeNull();
    // Bare: no card around the chart.
    expect(document.querySelector('[data-slot="card"]')).toBeNull();
  });

  it("shows the empty state until a resource and category are set", async () => {
    await mount({ resource: "posts", category: "" });
    expect(screen.getByText("Choose a resource and a category")).toBeTruthy();
    expect(slot("bar-chart")).toBeNull();
    cleanup();

    await mount({ resource: "", category: "status" });
    expect(screen.getByText("Choose a resource and a category")).toBeTruthy();
    cleanup();

    // Configured, but nothing to draw: the chart's own empty text, not the block's.
    await mount({
      resource: "posts",
      category: "status",
      value: "missing",
      type: "pie",
      aggregate: "sum",
    });
    await vi.waitFor(() => expect(slot("chart-empty")).not.toBeNull());
    expect(slot("chart-empty")?.textContent).toBe("No data");
    expect(screen.queryByText("Choose a resource and a category")).toBeNull();
  });

  it("shows the error state when the rows cannot be read", async () => {
    await mount({ resource: "ghosts", category: "status" });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("The chart data could not be loaded");
  });

  it("a category with markup renders as text", async () => {
    const markup = "<img src=x onerror=alert(1)>";
    await mount({ resource: "posts", category: "status", type: "bar" }, [
      { id: 1, status: markup, views: 1 },
    ]);
    await vi.waitFor(() => expect(ticks("bottom")).toEqual([markup]));
    expect(document.querySelector("img")).toBeNull();
  });
});
