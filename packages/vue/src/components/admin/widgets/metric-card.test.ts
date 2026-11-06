/**
 * `<MetricCard>`: the Vue twin of `@chelone/react`'s `widgets/metric-card.test.tsx`.
 * It reads no context, so the tests mount it bare and assert the DOM.
 */

import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import MetricCard from "./metric-card.vue";

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

const usd = (value: number) => `$${value.toLocaleString("en-US")}`;

function slot(w: VueWrapper, name: string) {
  return w.find(`[data-slot="${name}"]`);
}

describe("<MetricCard>", () => {
  it("renders the label, the formatted value and an up delta", () => {
    wrapper = mount(MetricCard, {
      props: { label: "Revenue", value: 12500, format: usd, delta: 0.052 },
    });
    expect(slot(wrapper, "metric-card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Revenue");
    expect(slot(wrapper, "metric-card-value").text()).toBe("$12,500");
    const delta = slot(wrapper, "metric-card-delta");
    expect(delta.text()).toBe("5.2%");
    expect(delta.attributes("data-direction")).toBe("up");
    expect(delta.find("svg").exists()).toBe(true);
  });

  it("renders a down delta and a flat one", () => {
    wrapper = mount(MetricCard, {
      props: { label: "Churn", value: 4, delta: -0.031 },
    });
    const down = slot(wrapper, "metric-card-delta");
    expect(down.text()).toBe("-3.1%");
    expect(down.attributes("data-direction")).toBe("down");
    wrapper.unmount();

    wrapper = mount(MetricCard, {
      props: { label: "Users", value: 9, delta: 0 },
    });
    const flat = slot(wrapper, "metric-card-delta");
    expect(flat.text()).toBe("0.0%");
    expect(flat.attributes("data-direction")).toBe("flat");
  });

  it("shows no delta when none is given", () => {
    wrapper = mount(MetricCard, { props: { label: "Orders", value: "n/a" } });
    expect(slot(wrapper, "metric-card-value").text()).toBe("n/a");
    expect(slot(wrapper, "metric-card-delta").exists()).toBe(false);
  });

  it("applies the format to a number only, and renders the icon", () => {
    wrapper = mount(MetricCard, {
      props: {
        label: "Stock",
        value: "12500",
        format: usd,
        icon: () => h("svg", { "data-testid": "custom-icon" }),
      },
    });
    expect(slot(wrapper, "metric-card-value").text()).toBe("12500");
    expect(wrapper.find('[data-testid="custom-icon"]').exists()).toBe(true);
  });

  it("loading shows skeletons and no label", () => {
    wrapper = mount(MetricCard, {
      props: { label: "Revenue", value: 12500, delta: 0.05, loading: true },
    });
    expect(wrapper.findAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(wrapper.text()).toBe("");
  });

  it("renders a label and value that hold markup as text", () => {
    const img = "<img src=x onerror=alert(1)>";
    const script = "<script>alert(1)</script>";
    wrapper = mount(MetricCard, {
      props: { label: img, value: script, delta: 0.1 },
    });
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find("script").exists()).toBe(false);
    expect(wrapper.text()).toContain(img);
    expect(slot(wrapper, "metric-card-value").text()).toBe(script);
  });
});
