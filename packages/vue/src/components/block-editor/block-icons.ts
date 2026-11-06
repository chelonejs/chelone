/**
 * The glyphs of the default blocks and the block bar, as dependency-free
 * functional components: `@chelone/vue` carries no icon library, so each is a
 * list of lucide shapes in one SVG. Decorative (`aria-hidden`); the button
 * carries the accessible label.
 */

import { type FunctionalComponent, h } from "vue";

type Tag = "path" | "line" | "rect" | "circle";
type Shape = readonly [tag: Tag, attrs: Record<string, string | number>];

const stroke = { fill: "none", stroke: "currentColor" };
const lucide = {
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
};

function glyph(...shapes: Shape[]): FunctionalComponent {
  const draw = ([tag, attrs]: Shape) => h(tag, attrs);
  return () =>
    h(
      "svg",
      {
        "aria-hidden": "true",
        viewBox: "0 0 24 24",
        width: 16,
        height: 16,
        ...stroke,
        ...lucide,
      },
      shapes.map(draw),
    );
}

const path = (d: string): Shape => ["path", { d }];
const circle = (cx: number, cy: number, r: number): Shape => [
  "circle",
  { cx, cy, r },
];

export const InfoIcon = glyph(
  circle(12, 12, 10),
  path("M12 16v-4"),
  path("M12 8h.01"),
);

export const ListCollapseIcon = glyph(
  path("m3 10 2.5-2.5L3 5"),
  path("m3 19 2.5-2.5L3 14"),
  path("M10 6h11"),
  path("M10 12h11"),
  path("M10 18h11"),
);

export const ImageIcon = glyph(
  ["rect", { width: 18, height: 18, x: 3, y: 3, rx: 2, ry: 2 }],
  circle(9, 9, 2),
  path("m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"),
);

export const VideoIcon = glyph(
  path(
    "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",
  ),
  ["rect", { x: 2, y: 6, width: 14, height: 12, rx: 2 }],
);

export const ChevronRightIcon = glyph(path("m9 18 6-6-6-6"));

export const SettingsIcon = glyph(
  path(
    "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
  ),
  circle(12, 12, 3),
);

export const CopyIcon = glyph(
  ["rect", { width: 14, height: 14, x: 8, y: 8, rx: 2, ry: 2 }],
  path("M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"),
);

export const ArrowUpIcon = glyph(path("m5 12 7-7 7 7"), path("M12 19V5"));

export const ArrowDownIcon = glyph(path("M12 5v14"), path("m19 12-7 7-7-7"));

export const Trash2Icon = glyph(
  path("M3 6h18"),
  path("M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"),
  path("M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"),
  ["line", { x1: 10, x2: 10, y1: 11, y2: 17 }],
  ["line", { x1: 14, x2: 14, y1: 11, y2: 17 }],
);
