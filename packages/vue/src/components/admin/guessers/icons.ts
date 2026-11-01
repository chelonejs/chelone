/**
 * The glyph the guessers need, as a dependency-free functional component.
 * `@chelone/vue` carries no icon library, so this renders an inline SVG with
 * the lucide stroke recipe, as `feedback/icons.ts` does. The icon is
 * decorative (`aria-hidden`); the heading beside it carries the text.
 */

import { type FunctionalComponent, h } from "vue";

/** A page with a question mark: the `<GuesserEmpty>` icon. */
export const FileQuestionIcon: FunctionalComponent<{ class?: string }> = (
  props,
) =>
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
    [
      "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      "M12 17h.01",
      "M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3",
    ].map((d) => h("path", { d })),
  );
