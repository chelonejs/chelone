/**
 * What the chart tests read back from the unovis components they mount. jsdom
 * has no layout, so they assert on the props unovis received, not on the SVG.
 * Its Vue wrappers declare only `data`, so the other props arrive as
 * attributes under the name the template wrote.
 */

import type { VueWrapper } from "@vue/test-utils";
import type { Component } from "vue";

export type ChartRow = { index: number; x: string; y: number | null };
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

export function visProps(wrapper: VueWrapper, component: Component, nth = 0) {
  const found = wrapper.findAllComponents(component)[nth];
  if (!found) return undefined;
  const all = new Map(
    Object.entries<PropValue>({ ...found.vm.$props, ...found.vm.$attrs }),
  );
  return (name: string) =>
    all.get(name) ??
    all.get(name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
}

export function required(wrapper: VueWrapper, component: Component, nth = 0) {
  const props = visProps(wrapper, component, nth);
  if (!props) throw new Error("the chart did not draw that component");
  return props;
}

/**
 * Readers over one mounted chart, bound to the unovis container component the
 * chart draws in. The component comes from the test, which may import unovis;
 * this file may not.
 */
export function chartReaders(container: Component) {
  function dataOf(wrapper: VueWrapper) {
    const data = required(wrapper, container)("data");
    if (!isRows(data)) throw new Error("the container has no rows");
    return data;
  }

  /** The values an accessor prop gives for each row. */
  function accessedOver(
    wrapper: VueWrapper,
    component: Component,
    name: string,
  ) {
    const accessor = required(wrapper, component)(name);
    if (!isAccessor(accessor)) throw new Error(`${name} is not an accessor`);
    return dataOf(wrapper).map((row, i) => accessor(row, i));
  }

  function tooltipHtml(
    wrapper: VueWrapper,
    crosshair: Component,
    row: ChartRow,
    index: number,
  ) {
    const template = required(wrapper, crosshair)("template");
    if (!isTemplate(template)) throw new Error("the crosshair has no template");
    const out = template(row, index, dataOf(wrapper));
    return typeof out === "string" ? out : out.outerHTML;
  }

  return { dataOf, accessedOver, tooltipHtml };
}

export function axis(
  wrapper: VueWrapper,
  axisComponent: Component,
  type: "x" | "y",
) {
  for (const nth of [0, 1]) {
    const props = visProps(wrapper, axisComponent, nth);
    if (props?.("type") !== type) continue;
    const format = props("tickFormat");
    if (!isTickFormat(format))
      throw new Error(`the ${type} axis has no tickFormat`);
    return format;
  }
  throw new Error(`no ${type} axis`);
}
