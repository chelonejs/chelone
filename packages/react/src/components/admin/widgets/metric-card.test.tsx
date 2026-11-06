/**
 * `<MetricCard>`: a headline number with its change since the last period.
 * It reads no context, so the tests render it bare and assert the DOM.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { Package } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { MetricCard } from "./metric-card";

afterEach(cleanup);

const usd = (value: number) => `$${value.toLocaleString("en-US")}`;

function slot(container: HTMLElement, name: string) {
  return container.querySelector(`[data-slot="${name}"]`);
}

describe("<MetricCard>", () => {
  it("renders the label, the formatted value and an up delta", () => {
    const { container } = render(
      <MetricCard label="Revenue" value={12500} format={usd} delta={0.052} />,
    );
    expect(slot(container, "metric-card")).not.toBeNull();
    expect(screen.getByText("Revenue")).toBeTruthy();
    expect(slot(container, "metric-card-value")?.textContent).toBe("$12,500");
    const delta = slot(container, "metric-card-delta");
    expect(delta?.textContent).toBe("5.2%");
    expect(delta?.getAttribute("data-direction")).toBe("up");
    expect(delta?.querySelector("svg")).not.toBeNull();
  });

  it("renders a down delta and a flat one", () => {
    const down = render(<MetricCard label="Churn" value={4} delta={-0.031} />);
    const downDelta = slot(down.container, "metric-card-delta");
    expect(downDelta?.textContent).toBe("-3.1%");
    expect(downDelta?.getAttribute("data-direction")).toBe("down");
    cleanup();

    const flat = render(<MetricCard label="Users" value={9} delta={0} />);
    const flatDelta = slot(flat.container, "metric-card-delta");
    expect(flatDelta?.textContent).toBe("0.0%");
    expect(flatDelta?.getAttribute("data-direction")).toBe("flat");
  });

  it("shows no delta when none is given", () => {
    const { container } = render(<MetricCard label="Orders" value="n/a" />);
    expect(slot(container, "metric-card-value")?.textContent).toBe("n/a");
    expect(slot(container, "metric-card-delta")).toBeNull();
  });

  it("applies the format to a number only, and renders the icon", () => {
    const { container } = render(
      <MetricCard label="Stock" value="12500" format={usd} icon={Package} />,
    );
    expect(slot(container, "metric-card-value")?.textContent).toBe("12500");
    expect(slot(container, "metric-card")?.querySelector("svg")).not.toBeNull();
  });

  it("loading shows skeletons and no label", () => {
    const { container } = render(
      <MetricCard label="Revenue" value={12500} delta={0.05} loading />,
    );
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Revenue")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("renders a label and value that hold markup as text", () => {
    const img = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    const { container } = render(
      <MetricCard label={img} value={script} delta={0.1} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText(img)).toBeTruthy();
    expect(slot(container, "metric-card-value")?.textContent).toBe(script);
  });
});
