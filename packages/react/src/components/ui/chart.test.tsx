/**
 * `chart.tsx` mounted the way a consumer uses it: a `ChartContainer` with a
 * config, and tooltip content fed a recharts-style payload. jsdom applies no
 * CSS, so the theme colours are read from the emitted `<style>` text.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";

const config: ChartConfig = {
  desktop: { label: "Desktop", theme: { light: "#111111", dark: "#eeeeee" } },
  mobile: { label: "Mobile", color: "#2563eb" },
};

describe("chart", () => {
  it("ChartContainer emits a colour per theme for a themed and a plain entry", () => {
    const { container } = render(
      <ChartContainer id="t" config={config}>
        <div />
      </ChartContainer>,
    );
    const css = container.querySelector("style")?.textContent ?? "";
    expect(css).toContain("[data-chart=chart-t]");
    expect(css).toMatch(/--color-desktop: #111111;/);
    expect(css).toMatch(
      /\.dark \[data-chart=chart-t\][^}]*--color-desktop: #eeeeee;/,
    );
    expect(css.match(/--color-mobile: #2563eb;/g)).toHaveLength(2);
  });

  it("ChartTooltipContent labels a row by the payload's own name, found in the nested payload", () => {
    render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          payload={[
            {
              graphicalItemId: "desktop-series",
              dataKey: "value",
              name: "ignored",
              value: 12,
              payload: { value: "desktop" },
            },
          ]}
        />
      </ChartContainer>,
    );
    expect(screen.getAllByText("Desktop").length).toBeGreaterThan(0);
  });
});
