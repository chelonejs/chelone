/**
 * The glyphs the common SFCs need, as dependency-free functional components.
 * `@chelone/vue` carries no icon library, so these render inline SVGs with the
 * lucide stroke recipe, the same convention as `feedback/icons.ts`. Icons are
 * decorative (`aria-hidden`); the surrounding text carries the meaning.
 */

import { type FunctionalComponent, h, type VNode } from "vue";

/** A shared stroked `<svg>` shell with the lucide recipe around `children`. */
function icon(children: () => VNode[]): FunctionalComponent<{
  class?: string;
}> {
  const cmp: FunctionalComponent<{ class?: string }> = (props) =>
    h(
      "svg",
      {
        class: props.class,
        viewBox: "0 0 24 24",
        width: "24",
        height: "24",
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

/** Sparkles — `<ApplicationUpdatedNotification>` glyph. */
export const SparklesIcon = icon(() => [
  h("path", {
    d: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  }),
  h("path", { d: "M20 3v4" }),
  h("path", { d: "M22 5h-4" }),
  h("path", { d: "M4 17v2" }),
  h("path", { d: "M5 18H3" }),
]);
