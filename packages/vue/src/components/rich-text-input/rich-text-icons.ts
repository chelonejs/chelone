/**
 * The toolbar glyphs, as dependency-free functional components: `@chelone/vue`
 * carries no icon library, so each is a list of lucide shapes in one SVG.
 * Decorative (`aria-hidden`); the button carries the accessible label.
 */

import type { RichTextToolbarItemId } from "@chelone/core";
import { type FunctionalComponent, h } from "vue";

type Attrs = Record<string, string | number>;
type Shape = readonly [tag: "path" | "line" | "rect", attrs: Attrs];

const svgAttrs = {
  viewBox: "0 0 24 24",
  width: 16,
  height: 16,
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true",
} satisfies Attrs;

const glyph =
  (...shapes: Shape[]): FunctionalComponent =>
  () =>
    h(
      "svg",
      svgAttrs,
      shapes.map(([tag, attrs]) => h(tag, attrs)),
    );

const path = (d: string): Shape => ["path", { d }];
const line = (x1: number, x2: number, y1: number, y2: number): Shape => [
  "line",
  { x1, x2, y1, y2 },
];

/** The glyph for each toolbar item. */
export const richTextIcons: Record<RichTextToolbarItemId, FunctionalComponent> =
  {
    bold: glyph(
      path(
        "M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8",
      ),
    ),
    italic: glyph(line(19, 10, 4, 4), line(14, 5, 20, 20), line(15, 9, 4, 20)),
    underline: glyph(path("M6 4v6a6 6 0 0 0 12 0V4"), line(4, 20, 20, 20)),
    strike: glyph(
      path("M16 4H9a3 3 0 0 0-2.83 4"),
      path("M14 12a4 4 0 0 1 0 8H6"),
      line(4, 20, 12, 12),
    ),
    code: glyph(path("m16 18 6-6-6-6"), path("m8 6-6 6 6 6")),
    clearFormatting: glyph(
      path("M4 7V4h16v3"),
      path("M5 20h6"),
      path("M13 4 8 20"),
      path("m15 15 5 5"),
      path("m20 15-5 5"),
    ),
    link: glyph(
      path("M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"),
      path("M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"),
    ),
    bulletList: glyph(
      path("M3 12h.01"),
      path("M3 18h.01"),
      path("M3 6h.01"),
      path("M8 6h13"),
      path("M8 12h13"),
      path("M8 18h13"),
    ),
    orderedList: glyph(
      path("M11 5h10"),
      path("M11 12h10"),
      path("M11 19h10"),
      path("M4 4h1v5"),
      path("M4 9h2"),
      path("M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"),
    ),
    blockquote: glyph(
      path(
        "M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z",
      ),
      path(
        "M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z",
      ),
    ),
    codeBlock: glyph(
      ["rect", { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
      path("m10 10-2 2 2 2"),
      path("m14 14 2-2-2-2"),
    ),
    horizontalRule: glyph(path("M5 12h14")),
    undo: glyph(
      path("M9 14 4 9l5-5"),
      path("M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"),
    ),
    redo: glyph(
      path("m15 14 5-5-5-5"),
      path("M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"),
    ),
  };
