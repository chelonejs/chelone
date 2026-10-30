/**
 * The glyphs the list-feature SFCs need, as dependency-free functional
 * components. `@chelone/vue` carries no icon library (unlike the React twin's
 * `lucide-react`), so these render inline SVGs with the lucide stroke recipe —
 * the same convention as the menu `icons.ts` sibling. Kept in a `.ts` file so
 * the `.vue` SFCs stay component-file-per-component.
 */

import { type FunctionalComponent, h, type VNode } from "vue";

/** A shared `<svg>` shell with the lucide stroke recipe around `children`. */
function icon(children: () => VNode[]): FunctionalComponent {
  const cmp: FunctionalComponent = () =>
    h(
      "svg",
      {
        viewBox: "0 0 24 24",
        width: "16",
        height: "16",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "aria-hidden": "true",
      },
      children(),
    );
  return cmp;
}

/** The `X` close glyph — the bulk-toolbar unselect-all control. */
export const XIcon: FunctionalComponent = icon(() => [
  h("path", { d: "M18 6 6 18" }),
  h("path", { d: "m6 6 12 12" }),
]);

/** A minus-in-a-circle glyph — the filter-form remove-filter control. */
export const MinusCircleIcon: FunctionalComponent = icon(() => [
  h("circle", { cx: "12", cy: "12", r: "10" }),
  h("path", { d: "M8 12h8" }),
]);

/** A left chevron — the pagination previous-page control. */
export const ChevronLeftIcon: FunctionalComponent = icon(() => [
  h("path", { d: "m15 18-6-6 6-6" }),
]);

/** A right chevron — the pagination next-page control. */
export const ChevronRightIcon: FunctionalComponent = icon(() => [
  h("path", { d: "m9 18 6-6-6-6" }),
]);
