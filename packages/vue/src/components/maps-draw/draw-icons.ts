import { defineComponent, h } from "vue";
import type { DrawTool } from "./use-terra-draw";

/** The path data of one 24 by 24 outline icon per toolbar button. */
const DRAW_ICONS: Record<DrawTool | "delete", readonly string[]> = {
  "draw-point": [
    "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
    "M9 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  ],
  "draw-line": [
    "M17 5a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
    "M3 19a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
    "M5 17A12 12 0 0 1 17 5",
  ],
  "draw-polygon": [
    "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  ],
  "draw-rectangle": [
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
  ],
  "draw-circle": ["M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0"],
  cut: [
    "M4 4a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
    "M4 16a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
    "M6 18 20 4",
    "M14.5 14.5 20 20",
    "M8.12 8.12 12 12",
  ],
  edit: [
    "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
    "m15 5 4 4",
  ],
  move: [
    "M12 2v20",
    "m15 19-3 3-3-3",
    "m19 9 3 3-3 3",
    "M2 12h20",
    "m5 9-3 3 3 3",
    "m9 5 3-3 3 3",
  ],
  delete: [
    "M3 6h18",
    "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",
    "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",
    "M10 11v6",
    "M14 11v6",
  ],
};

/**
 * An inline SVG of a toolbar button's icon, since the Vue package has no icon
 * library. It takes the color of the surrounding text.
 */
export const DrawIcon = defineComponent(
  (props: { name: DrawTool | "delete" }) => {
    return () =>
      h(
        "svg",
        {
          viewBox: "0 0 24 24",
          width: 16,
          height: 16,
          fill: "none",
          stroke: "currentColor",
          "stroke-width": 2,
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "aria-hidden": "true",
        },
        DRAW_ICONS[props.name].map((d) => h("path", { d, key: d })),
      );
  },
  { name: "DrawIcon", props: { name: { type: null, required: true } } },
);
