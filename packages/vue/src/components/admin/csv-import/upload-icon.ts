import { type FunctionalComponent, h } from "vue";

/** The lucide `upload` glyph, inline because `@chelone/vue` carries no icon library. */
export const UploadIcon: FunctionalComponent = () =>
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
    [
      h("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
      h("polyline", { points: "17 8 12 3 7 8" }),
      h("line", { x1: "12", x2: "12", y1: "3", y2: "15" }),
    ],
  );
