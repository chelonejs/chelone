/**
 * The dependency-free `chart` family, mounted the way a consumer composes it.
 * jsdom applies no CSS, so the tests pin DOM, attributes and the generated
 * stylesheet text, never appearance.
 */

import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegendContent,
  ChartStyle,
  ChartTooltipContent,
  componentToString,
  useChart,
} from "./index";

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

function mountTracked(
  component: Parameters<typeof mount>[0],
  props?: Record<string, unknown>,
): VueWrapper {
  const wrapper = mount(component, { props, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}

const config: ChartConfig = {
  desktop: { label: "Desktop", color: "#ff0000" },
  mobile: { label: "Mobile", theme: { light: "#00ff00", dark: "#0000ff" } },
};

describe("<ChartContainer>", () => {
  it("sets data-chart and provides the config to its children", () => {
    const Probe = defineComponent({
      setup() {
        const { config: provided } = useChart();
        return () =>
          h(
            "span",
            { "data-testid": "probe" },
            Object.keys(provided.value).join(","),
          );
      },
    });
    const wrapper = mountTracked(ChartContainer, { config });
    expect(wrapper.attributes("data-slot")).toBe("chart");
    expect(wrapper.attributes("data-chart")).toMatch(/^chart-\S+$/);

    const withChild = mountTracked(
      defineComponent({
        render: () => h(ChartContainer, { config }, () => h(Probe)),
      }),
    );
    expect(withChild.get("[data-testid=probe]").text()).toBe("desktop,mobile");
  });

  it("uses a given id in data-chart", () => {
    const wrapper = mountTracked(ChartContainer, { config, id: "sales" });
    expect(wrapper.attributes("data-chart")).toBe("chart-sales");
  });

  it("two containers on one page get different ids", () => {
    const wrapper = mountTracked(
      defineComponent({
        render: () => [
          h(ChartContainer, { config }),
          h(ChartContainer, { config }),
        ],
      }),
    );
    const [a, b] = wrapper
      .findAll("[data-slot=chart]")
      .map((el) => el.attributes("data-chart"));
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe("<ChartContainer> under server rendering", () => {
  it("hydrates to the same data-chart after earlier server renders", async () => {
    const page = () =>
      createSSRApp({
        render: () => h(ChartContainer, { config }),
      });
    // Earlier requests in the same process must not shift the next page's id.
    await renderToString(page());
    await renderToString(page());
    const html = await renderToString(page());
    const serverId = /data-chart="([^"]+)"/.exec(html)?.[1];

    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.append(host);
    const app = page();
    app.mount(host);
    const clientId = host
      .querySelector("[data-slot=chart]")
      ?.getAttribute("data-chart");
    expect(clientId).toBe(serverId);
    expect(host.querySelector("style")?.textContent).toContain(
      `[data-chart=${serverId}]`,
    );
    app.unmount();
    host.remove();
  });
});

describe("<ChartStyle>", () => {
  it("writes a CSS variable per configured color for the light and dark themes", () => {
    const wrapper = mountTracked(ChartStyle, { id: "chart-x", config });
    const css = wrapper.get("style").element.textContent ?? "";
    expect(css).toContain("[data-chart=chart-x]");
    expect(css).toContain(".dark [data-chart=chart-x]");
    // light block: desktop color + mobile light theme
    expect(css).toMatch(
      /\[data-chart=chart-x\] \{[^}]*--color-desktop: #ff0000;/,
    );
    expect(css).toMatch(
      /\[data-chart=chart-x\] \{[^}]*--color-mobile: #00ff00;/,
    );
    // dark block: desktop falls back to its color, mobile takes the dark theme
    expect(css).toMatch(
      /\.dark \[data-chart=chart-x\] \{[^}]*--color-mobile: #0000ff;/,
    );
  });

  it("renders nothing when no entry has a color", () => {
    const wrapper = mountTracked(ChartStyle, {
      id: "chart-x",
      config: { a: { label: "A" } },
    });
    expect(wrapper.find("style").exists()).toBe(false);
  });

  it("a color that holds </style><script> creates no script element", () => {
    const wrapper = mountTracked(ChartStyle, {
      id: "chart-x",
      config: {
        evil: {
          color: "red;}</style><script>window.__pwned = 1</script><style>",
        },
        ok: { color: "blue" },
      },
    });
    expect(document.querySelector("script")).toBeNull();
    expect(wrapper.element.parentElement?.querySelector("script")).toBeNull();
    const css = wrapper.get("style").element.textContent ?? "";
    expect(css).not.toContain("<script");
    expect(css).not.toContain("--color-evil");
    expect(css).toContain("--color-ok: blue;");
  });
});

describe("<ChartLegendContent>", () => {
  it("lists each config entry with its label and color", () => {
    const wrapper = mountTracked(
      defineComponent({
        render: () =>
          h(ChartContainer, { config }, () => h(ChartLegendContent)),
      }),
    );
    const items = wrapper.findAll("[data-slot=chart-legend-item]");
    expect(items.map((item) => item.text())).toEqual(["Desktop", "Mobile"]);
    const swatch = items[0]?.get("div").element as HTMLElement;
    expect(swatch.style.backgroundColor).toBe("rgb(255, 0, 0)");
  });
});

describe("<ChartLegendContent> without a label", () => {
  it("falls back to the config key", () => {
    const wrapper = mountTracked(
      defineComponent({
        render: () =>
          h(ChartContainer, { config: { desktop: { color: "red" } } }, () =>
            h(ChartLegendContent),
          ),
      }),
    );
    expect(wrapper.get("[data-slot=chart-legend-item]").text()).toBe("desktop");
  });
});

describe("<ChartTooltipContent> rows", () => {
  const rowsOf = (payload: Record<string, unknown>) => {
    const html =
      componentToString(config, ChartTooltipContent, {})?.(payload) ?? "";
    const el = document.createElement("div");
    el.innerHTML = html;
    return el;
  };

  it("ignores payload keys inherited from Object.prototype", () => {
    const el = rowsOf({ desktop: 1, constructor: "x", toString: "y" });
    expect(el.textContent).toContain("Desktop");
    expect(el.textContent).not.toContain("constructor");
    expect(el.textContent).not.toContain("toString");
    expect(el.innerHTML).not.toContain("--color-constructor");
  });

  it("shows no value text for a null or undefined value", () => {
    const el = rowsOf({ desktop: null, mobile: 80 });
    expect(el.textContent).toContain("Desktop");
    expect(el.textContent).toContain("80");
    expect(el.textContent).not.toContain("null");
    expect(el.textContent).not.toContain("undefined");
  });
});

describe("componentToString", () => {
  it("renders a tooltip component to HTML with its payload", () => {
    const render = componentToString(config, ChartTooltipContent, {});
    expect(render).toBeTypeOf("function");
    const html = render?.({ desktop: 186, mobile: 80 }) ?? "";
    expect(html).toContain("Desktop");
    expect(html).toContain("186");
    expect(html).toContain("Mobile");
    expect(html).toContain("80");
  });

  it("escapes a payload label that holds markup", () => {
    const hostile: ChartConfig = {
      a: { label: "<img src=x onerror=alert(1)>", color: "red" },
      b: { label: "<script>alert(1)</script>", color: "blue" },
    };
    const render = componentToString(hostile, ChartTooltipContent, {
      labelFormatter: (x: number | Date) => `<img src=x onerror=alert(${x})>`,
    });
    const html =
      render?.(
        { a: "<img src=x onerror=alert(1)>", b: "<script>alert(1)</script>" },
        1,
      ) ?? "";
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;script");
  });
});
